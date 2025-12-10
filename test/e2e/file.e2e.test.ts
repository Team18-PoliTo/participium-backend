import request from "supertest";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { generateCitizenToken } from "../utils/auth";

// DO NOT import app or database globally here. 
// We import them dynamically to ensure mocks apply.

describe("File E2E Tests", () => {
  let app: any;
  let AppDataSource: DataSource;
  let CitizenDAO: any;
  let TempFileDAO: any;
  let token: string;

  beforeAll(async () => {
    // 1. Reset modules to clear the cache of src/app.ts and its imports
    jest.resetModules();

    // 2. Mock MinIO init to prevent connection attempts
    jest.mock("../../src/config/initMinio", () => ({
      initMinio: jest.fn().mockResolvedValue(undefined),
    }));

    // 3. Mock MinIoService to avoid real network calls or FS operations
    jest.mock("../../src/services/MinIoService", () => ({
      __esModule: true,
      default: {
        uploadFile: jest.fn().mockResolvedValue("test-bucket/temp/mock-file-id.png"),
        deleteFile: jest.fn().mockResolvedValue(undefined),
        copyFile: jest.fn().mockResolvedValue(undefined),
        fileExists: jest.fn().mockResolvedValue(true),
        getPresignedUrl: jest.fn().mockResolvedValue("http://mock-minio/presigned-url"),
      },
    }));

    // 4. Import App and DB AFTER mocks are defined
    const appModule = await import("../../src/app");
    app = appModule.default;
    
    const dbModule = await import("../../src/config/database");
    AppDataSource = dbModule.AppDataSource;
    
    const citizenModule = await import("../../src/models/dao/CitizenDAO");
    CitizenDAO = citizenModule.default;
    
    const tempFileModule = await import("../../src/models/dao/TempFileDAO");
    TempFileDAO = tempFileModule.default;

    // 5. Initialize Database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);
  });

  beforeEach(async () => {
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    const tempFileRepo = AppDataSource.getRepository(TempFileDAO);
    
    await citizenRepo.clear();
    await tempFileRepo.clear();

    const timestamp = Date.now();
    const citizen = await citizenRepo.save({
      email: `files_${timestamp}@test.com`,
      username: `filetester_${timestamp}`,
      firstName: "File",
      lastName: "Tester",
      password: await bcrypt.hash("test-password", 10),
    });
    token = generateCitizenToken(citizen.id, citizen.email);
  });

  afterAll(async () => {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
    }
    jest.clearAllMocks();
  });

  it("should upload a valid image file", async () => {
    const buffer = Buffer.from("fake-image-content");
    
    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", buffer, "test.png")
      .expect(201);

    expect(res.body).toHaveProperty("fileId");
    expect(res.body.filename).toBe("test.png");
    expect(res.body.tempPath).toContain("temp/");

    const tempRepo = AppDataSource.getRepository(TempFileDAO);
    const dbFile = await tempRepo.findOne({ where: { fileId: res.body.fileId } });
    expect(dbFile).toBeDefined();
  });

  it("should reject non-image files", async () => {
    const buffer = Buffer.from("alert('hacked');");
    
    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", buffer, "malicious.js")
      .expect(400);

    expect(res.body.error).toContain("File type");
  });

  it("should delete a temp file", async () => {
    const buffer = Buffer.from("image");
    const uploadRes = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", buffer, "del.png");
    
    const fileId = uploadRes.body.fileId;

    await request(app)
      .delete(`/api/files/temp/${fileId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const tempRepo = AppDataSource.getRepository(TempFileDAO);
    const dbFile = await tempRepo.findOne({ where: { fileId } });
    expect(dbFile).toBeNull();
  });

  it("should require authorization", async () => {
    await request(app)
      .post("/api/files/upload")
      .attach("file", Buffer.from("data"), "test.png")
      .expect(401);
  });
});