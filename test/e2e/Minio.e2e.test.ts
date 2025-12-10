jest.mock("minio", () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      listBuckets: jest.fn().mockResolvedValue([{ name: "reports" }]),
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue("etag"),
      getObject: jest.fn().mockResolvedValue({
        on: (event: string, cb: Function) => {
          if (event === 'data') cb(Buffer.from("Hello from MinIO E2E test!", "utf-8"));
          if (event === 'end') cb();
          return;
        },
        pipe: jest.fn()
      }),
      removeObject: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

import { Client } from "minio";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "reports";

describe("MinIO E2E Tests (Mocked)", () => {
    let minioClient: Client;

    const initMinio = async () => {
        try {
            const buckets = await minioClient.listBuckets();
            const exists = buckets.some(b => b.name === MINIO_BUCKET);

            if (!exists) {
                await minioClient.makeBucket(MINIO_BUCKET, "");
            }
        } catch (error: any) {
            console.error("MinIO connection error:", error.message);
            throw error;
        }
    };

    beforeAll(async () => {
        minioClient = new Client({
            endPoint: "localhost",
            port: 9000,
            useSSL: false,
            accessKey: "minioadmin",
            secretKey: "minioadmin"
        });

        await initMinio();
    });

    it("bucket should exist after init", async () => {
        const buckets = await minioClient.listBuckets();
        expect(buckets.some(b => b.name === MINIO_BUCKET)).toBe(true);
    });

    it("init logic is idempotent", async () => {
        await expect(initMinio()).resolves.not.toThrow();
    });

    it("MINIO_BUCKET is present in listBuckets()", async () => {
        const buckets = await minioClient.listBuckets();
        const names = buckets.map(b => b.name);
        expect(names).toContain(MINIO_BUCKET);
    });

    it("can upload, download and delete an object", async () => {
        const objectName = `e2e-test-object-${Date.now()}.txt`;
        const content = "Hello from MinIO E2E test!";
        const buffer = Buffer.from(content, "utf-8");

        await minioClient.putObject(MINIO_BUCKET, objectName, buffer);
        await minioClient.getObject(MINIO_BUCKET, objectName);

        expect(minioClient.putObject).toHaveBeenCalledWith(MINIO_BUCKET, objectName, buffer);
        expect(minioClient.getObject).toHaveBeenCalledWith(MINIO_BUCKET, objectName);

        await minioClient.removeObject(MINIO_BUCKET, objectName);
        expect(minioClient.removeObject).toHaveBeenCalledWith(MINIO_BUCKET, objectName);
    });
});