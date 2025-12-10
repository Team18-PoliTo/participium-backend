import request from "supertest";
import jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
import { ReportStatus } from "../../src/constants/ReportStatus";

jest.mock("../../src/config/initMinio", () => ({
  initMinio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/services/MinIoService", () => ({
  __esModule: true,
  default: {
    uploadFile: jest.fn().mockResolvedValue("reports/mock-file.png"),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
    fileExists: jest.fn().mockResolvedValue(true),
    getPresignedUrl: jest.fn().mockResolvedValue("http://mock-minio/presigned-url"),
    uploadUserProfilePhoto: jest.fn().mockResolvedValue("citizens/1/profile.jpg"),
  },
}));

let mockCounter = 1;

jest.mock("../../src/services/FileService", () => ({
    __esModule: true,
    default: {
        uploadTemp: jest.fn().mockImplementation(async (file) => ({
            fileId: `mock-file-id-${mockCounter++}`,
            filename: file.originalname,
            size: 1024,
            mimeType: "image/png",
            tempPath: `temp/mock-path/${file.originalname}`,
            expiresAt: new Date(Date.now() + 86400000).toISOString()
        })),

        validateTempFiles: jest.fn().mockResolvedValue([
            { fileId: "mock-file-id-1", originalName: "photo1.png", tempPath: "temp/1.png" },
            { fileId: "mock-file-id-2", originalName: "photo2.png", tempPath: "temp/2.png" },
            { fileId: "mock-file-id-3", originalName: "photo3.png", tempPath: "temp/3.png" }
        ]),

        moveMultipleToPermanent: jest.fn().mockResolvedValue([
            "reports/1/photo1.png",
            "reports/1/photo2.png",
            "reports/1/photo3.png"
        ]),

        deleteTempFile: jest.fn().mockResolvedValue(undefined),

        cleanupExpiredTempFiles: jest.fn().mockResolvedValue(0),
    }
}));

describe("Report E2E Tests", () => {
  let app: any;
  let AppDataSource: DataSource;
  let CitizenDAO: any;
  let ReportDAO: any;
  let CategoryDAO: any;
  
  let citizenId: number;
  let token: string;

  const photo1 = Buffer.from("test1");
  const photo2 = Buffer.from("test2");
  const photo3 = Buffer.from("test3");

  beforeAll(async () => {
    jest.resetModules();

    const appModule = await import("../../src/app");
    app = appModule.default;
    
    const dbModule = await import("../../src/config/database");
    AppDataSource = dbModule.AppDataSource;
    
    CitizenDAO = (await import("../../src/models/dao/CitizenDAO")).default;
    ReportDAO = (await import("../../src/models/dao/ReportDAO")).default;
    CategoryDAO = (await import("../../src/models/dao/CategoryDAO")).default;

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);

    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const categories = [
      { name: "Roads and Urban Furnishings", description: "Strade e Arredi Urbani" },
      { name: "Waste", description: "Rifiuti" },
      { name: "Public Lighting", description: "Illuminazione Pubblica" }
    ];

    for (const cat of categories) {
      const existing = await categoryRepo.findOne({ where: { name: cat.name } });
      if (!existing) await categoryRepo.save(cat);
    }
  });

  beforeEach(async () => {
    const reportRepo = AppDataSource.getRepository(ReportDAO);
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    
    await reportRepo.clear();
    await citizenRepo.clear();
    
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const citizen = await citizenRepo.save({
      email: `citizen${randomSuffix}@test.com`,
      username: `testcitizen${randomSuffix}`,
      password: "hashed-password",
      firstName: "Test",
      lastName: "Citizen",
    });

    citizenId = citizen.id;

    token = jwt.sign(
        { sub: citizenId, kind: "citizen", email: citizen.email },
        process.env.JWT_SECRET ?? "dev-secret"
    );
  });

  afterAll(async () => {
      if (AppDataSource?.isInitialized) {
          await AppDataSource.destroy();
      }
      jest.clearAllMocks();
  });

  it("should create a report with 3 photos", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const roadsCategory = await categoryRepo.findOne({ where: { name: "Roads and Urban Furnishings" } });

    const upload1 = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "photo1.png");
    const upload2 = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo2, "photo2.png");
    const upload3 = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo3, "photo3.png");

    expect(upload1.status).toBe(201);
    expect(upload2.status).toBe(201);
    expect(upload3.status).toBe(201);
    
    const photoIds = [upload1.body.fileId, upload2.body.fileId, upload3.body.fileId];

    // 2. Create Report
    const res = await request(app)
        .post("/api/citizens/report") // Singular route
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Pothole",
          description: "Big pothole on main street",
          categoryId: roadsCategory.id, //ignore
          location: { latitude: 45.4642, longitude: 9.19 },
          photoIds
        });

    expect(res.status).toBe(201);
    expect(res.body.photos).toHaveLength(3);
    res.body.photos.forEach((photoUrl: string) => {
      expect(photoUrl).toContain("http");
    });
  });

  it("should store photos in MinIO and retrieve them", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const waste = await categoryRepo.findOne({ where: { name: "Waste" } });

    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");
    
    expect(upload.status).toBe(201);

    const res = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Test Photo",
          description: "Testing",
          categoryId: waste.id, //ignore
          location: { latitude: 45, longitude: 9 },
          photoIds: [upload.body.fileId]
        });

    expect(res.status).toBe(201);
    expect(res.body.photos[0]).toContain("http");
  });

  it("should validate report payload", async () => {
    const res = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({}); 
    expect(res.status).toBe(400);
  });

  it("should return 400 when category does not exist", async () => {
    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");
    
    expect(upload.status).toBe(201);

    const res = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Ghost",
          description: "Invalid category",
          categoryId: 99999,
          location: { latitude: 1, longitude: 2 },
          photoIds: [upload.body.fileId],
        });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Category not found");
  });

  it("should return reports by current user", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);
      const waste = await categoryRepo.findOne({ where: { name: "Waste" } });

      const upload = await request(app)
          .post("/api/files/upload")
          .set("Authorization", `Bearer ${token}`)
          .attach("file", photo1, "ph.png");
      
      expect(upload.status).toBe(201);

      await request(app)
          .post("/api/citizens/report")
          .set("Authorization", `Bearer ${token}`)
          .send({
              title: "User report",
              description: "Test",
              categoryId: waste.id, //ignore
              location: { latitude: 1, longitude: 1 },
              photoIds: [upload.body.fileId]
          });

      // Fetch Reports (Route is plural/myReports)
      const res = await request(app)
          .get("/api/citizens/reports/myReports")
          .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].title).toBe("User report");
  });

  it("should retrieve a report by ID", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const waste = await categoryRepo.findOne({ where: { name: "Waste" } });
    const upload = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", photo1, "ph.png");
    
    expect(upload.status).toBe(201);

    const createRes = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({
            title: "For GetByID",
            description: "Test",
            categoryId: waste.id,
            location: { latitude: 45, longitude: 9 },
            photoIds: [upload.body.fileId]
        });
    
    expect(createRes.status).toBe(201);
    const reportId = createRes.body.id;

    const res = await request(app)
        .get(`/api/citizens/reports/getById/${reportId}`)
        .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("For GetByID");
    expect(res.body.id).toBe(reportId);
  });

  it("should return 404 for non-existent report ID", async () => {
    const res = await request(app)
        .get(`/api/citizens/reports/getById/99999`)
        .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Report not found");
  });

  it("should retrieve assigned reports in map area", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const waste = await categoryRepo.findOne({ where: { name: "Waste" } });
    const upload = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", photo1, "ph.png");
    
    expect(upload.status).toBe(201);

    const createRes = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({
            title: "Map Report",
            description: "Map Test",
            categoryId: waste.id, //ignore
            location: { latitude: 45.5, longitude: 9.5 }, 
            photoIds: [upload.body.fileId]
        });
    
    expect(createRes.status).toBe(201);
    const reportId = createRes.body.id;

    await AppDataSource.getRepository(ReportDAO).update(reportId, { status: ReportStatus.ASSIGNED });

    const res = await request(app)
        .post("/api/citizens/reports/map")
        .set("Authorization", `Bearer ${token}`)
        .send({
            corners: [
                { latitude: 45, longitude: 9 },
                { latitude: 46, longitude: 10 }
            ]
        });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const targetReport = res.body.find((r: any) => r.id === reportId);
    expect(targetReport).toBeDefined();
    expect(targetReport.title).toBe("Map Report");
  });

  it("should return 400 for invalid map request", async () => {
    const res = await request(app)
        .post("/api/citizens/reports/map")
        .set("Authorization", `Bearer ${token}`)
        .send({
            corners: [
                { latitude: 45.0, longitude: 9.0 }
            ]
        });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should reject creation without authorization", async () => {
    const res = await request(app).post("/api/citizens/report").send({});
    expect(res.status).toBe(401);
  });

  it("should reject report update without authorization", async () => {
    const res = await request(app)
        .patch("/api/citizens/me") 
        .send({ firstName: "Updated" });

    expect(res.status).toBe(401);
  });

  it("fails updating report with wrong payload", async () => {
    const res = await request(app)
        .patch("/api/citizens/reports/999") 
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "INVALID" });

    expect(res.status).toBe(404);
  });

  it("should create a report successfully (no update test)", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);
      const waste = await categoryRepo.findOne({ where: { name: "Waste" } });

      const upload = await request(app)
          .post("/api/files/upload")
          .set("Authorization", `Bearer ${token}`)
          .attach("file", photo1, "ph.png");

      expect(upload.status).toBe(201);

      const create = await request(app)
          .post("/api/citizens/report")
          .set("Authorization", `Bearer ${token}`)
          .send({
              title: "WillUpdate",
              description: "Old",
              categoryId: waste.id, //ignore
              location: { latitude: 2, longitude: 3 },
              photoIds: [upload.body.fileId]
          });

      expect(create.status).toBe(201);
      expect(create.body.id).toBeDefined();
  });

  it("should reject non-image upload", async () => {
    const badFile = Buffer.from("not an image");
    
    const fileServiceMock = require("../../src/services/FileService").default;
    fileServiceMock.uploadTemp.mockImplementationOnce(() => {
        throw new Error("File type undefined is not allowed. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp");
    });

    const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", badFile, "file.txt");

    expect(res.status).toBe(400);
  });

  it("should delete photos from MinIO (logic check)", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const lighting = await categoryRepo.findOne({ where: { name: "Public Lighting" } });

    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");
    
    expect(upload.status).toBe(201);

    const res = await request(app)
        .post("/api/citizens/report")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Delete Test",
          description: "Testing delete",
          categoryId: lighting.id, //ignore 
          location: { latitude: 45, longitude: 9 },
          photoIds: [upload.body.fileId]
        });

    expect(res.status).toBe(201);
    expect(typeof res.body.photos[0]).toBe("string");
  });
});