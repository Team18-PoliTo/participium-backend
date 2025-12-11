// test/unit/services/minioService.test.ts
// Define the mock factory
jest.mock("../../../src/config/minioClient", () => ({
  minioClient: {
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    statObject: jest.fn(),
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
  },
  minioClientForPresigned: {
    presignedGetObject: jest.fn(),
  },
  MINIO_BUCKET: "reports",
  PROFILE_BUCKET: "profiles",
}));

describe("MinIoService", () => {
  let MinIoService: any;
  let mockMinioClient: any;
  let mockMinioClientForPresigned: any;

  beforeAll(() => {
    // 1. Clear the module cache to remove the "real" service instance loaded by test/setup.ts
    jest.resetModules();

    // 2. Set environment variable required for uploadUserProfilePhoto
    process.env.MINIO_PROFILE_BUCKET = "profiles";

    // 3. Re-require the config to get the fresh mock references associated with this context
    const config = require("../../../src/config/minioClient");
    mockMinioClient = config.minioClient;
    mockMinioClientForPresigned = config.minioClientForPresigned;

    // 4. Re-require the service to ensure it uses the mocks defined above
    MinIoService = require("../../../src/services/MinIoService").default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploadFile should call putObject", async () => {
    const buf = Buffer.from("test");
    await MinIoService.uploadFile("bucket", "key", buf, "image/png");
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "bucket",
      "key",
      buf,
      4,
      { "Content-Type": "image/png" }
    );
  });

  it("deleteFile should call removeObject", async () => {
    await MinIoService.deleteFile("bucket", "key");
    expect(mockMinioClient.removeObject).toHaveBeenCalledWith("bucket", "key");
  });

  it("fileExists should return true if statObject succeeds", async () => {
    mockMinioClient.statObject.mockResolvedValue({});
    const exists = await MinIoService.fileExists("key");
    expect(exists).toBe(true);
  });

  it("fileExists should return false if statObject fails", async () => {
    mockMinioClient.statObject.mockRejectedValue(new Error("Not found"));
    const exists = await MinIoService.fileExists("key");
    expect(exists).toBe(false);
  });

  it("getPresignedUrl should return url", async () => {
    mockMinioClientForPresigned.presignedGetObject.mockResolvedValue(
      "http://url"
    );
    const url = await MinIoService.getPresignedUrl("key");
    expect(url).toBe("http://url");
  });

  it("getPresignedUrl should return empty string on error", async () => {
    mockMinioClientForPresigned.presignedGetObject.mockRejectedValue(
      new Error("Fail")
    );
    const url = await MinIoService.getPresignedUrl("key");
    expect(url).toBe("");
  });

  it("copyFile should get, stat, and put", async () => {
    // Mock stream for getObject
    const stream = {
      on: (event: string, cb: any) => {
        if (event === "data") cb(Buffer.from("content"));
        if (event === "end") cb();
      },
    };
    mockMinioClient.getObject.mockResolvedValue(stream);
    mockMinioClient.statObject.mockResolvedValue({
      metaData: { "content-type": "text/plain" },
    });

    await MinIoService.copyFile("src", "dest");

    expect(mockMinioClient.getObject).toHaveBeenCalled();
    // Expect MINIO_BUCKET ("reports" from mock)
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "reports",
      "dest",
      expect.any(Buffer),
      7,
      { "Content-Type": "text/plain" }
    );
  });

  it("copyFile handles stat failure by using default content type", async () => {
    const stream = {
      on: (event: string, cb: any) => {
        if (event === "end") cb();
      },
    };
    mockMinioClient.getObject.mockResolvedValue(stream);
    mockMinioClient.statObject.mockRejectedValue(new Error("Fail"));

    await MinIoService.copyFile("src", "dest");

    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "reports",
      "dest",
      expect.any(Buffer),
      0,
      { "Content-Type": "application/octet-stream" }
    );
  });

  it("copyFile should use Content-Type metadata when content-type is not available", async () => {
    const stream = {
      on: (event: string, cb: any) => {
        if (event === "data") cb(Buffer.from("content"));
        if (event === "end") cb();
      },
    };
    mockMinioClient.getObject.mockResolvedValue(stream);
    mockMinioClient.statObject.mockResolvedValue({
      metaData: { "Content-Type": "image/png" },
    });

    await MinIoService.copyFile("src", "dest");

    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "reports",
      "dest",
      expect.any(Buffer),
      7,
      { "Content-Type": "image/png" }
    );
  });

  it("uploadUserProfilePhoto uploads to profile bucket", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(true);
    const file = {
      originalname: "p.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("data"),
    } as any;

    const key = await MinIoService.uploadUserProfilePhoto(1, file);

    expect(key).toContain("citizens/1/profile.jpg");
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "profiles",
      key,
      expect.any(Buffer),
      4,
      expect.any(Object)
    );
  });

  it("uploadUserProfilePhoto creates bucket if missing", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(false);
    const file = {
      originalname: "p.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("data"),
    } as any;

    await MinIoService.uploadUserProfilePhoto(1, file);

    expect(mockMinioClient.makeBucket).toHaveBeenCalledWith("profiles");
  });

  it("uploadUserProfilePhoto throws if no file", async () => {
    await expect(
      MinIoService.uploadUserProfilePhoto(1, undefined as any)
    ).rejects.toThrow();
  });

  it("uploadUserProfilePhoto should handle file without extension", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(true);
    const file = {
      originalname: "profile",
      mimetype: "image/jpeg",
      buffer: Buffer.from("data"),
    } as any;

    const key = await MinIoService.uploadUserProfilePhoto(1, file);

    // When no extension, it uses the originalname as extension, so "profile.profile"
    expect(key).toContain("citizens/1/profile.profile");
  });

  it("uploadUserProfilePhoto should handle file without mimetype", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(true);
    const file = {
      originalname: "profile.png",
      mimetype: undefined,
      buffer: Buffer.from("data"),
    } as any;

    const key = await MinIoService.uploadUserProfilePhoto(1, file);

    expect(key).toContain("citizens/1/profile.png");
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "profiles",
      key,
      expect.any(Buffer),
      4,
      { "Content-Type": "application/octet-stream" }
    );
  });

  it("getPresignedUrl should handle error with message property", async () => {
    const error = { message: "Connection failed" };
    mockMinioClientForPresigned.presignedGetObject.mockRejectedValue(error);
    const url = await MinIoService.getPresignedUrl("key", "bucket", 3600);
    expect(url).toBe("");
  });

  it("getPresignedUrl should handle error without message property", async () => {
    const error = "Simple string error";
    mockMinioClientForPresigned.presignedGetObject.mockRejectedValue(error);
    const url = await MinIoService.getPresignedUrl("key", "bucket", 3600);
    expect(url).toBe("");
  });
});
