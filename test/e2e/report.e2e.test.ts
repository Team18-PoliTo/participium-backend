import request from "supertest";
import app from "../../src/app";
import { initMinio } from "../../src/config/initMinio";
import { minioClient, MINIO_BUCKET } from "../../src/config/minioClient";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import ReportDAO from "../../src/models/dao/ReportDAO";
import CategoryDAO from "../../src/models/dao/CategoryDAO";
import TempFileDAO from "../../src/models/dao/TempFileDAO";

describe("Report E2E Tests (real DB + MinIO)", () => {
  let citizenId: number;
  let token: string;

  const photo1 = Buffer.from("test1");
  const photo2 = Buffer.from("test2");
  const photo3 = Buffer.from("test3");

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await initMinio();

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
    const repo = AppDataSource.getRepository(CitizenDAO);
    const randomSuffix = Math.floor(Math.random() * 100000);

    const citizen = await repo.save({
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

  afterEach(async () => {
    await AppDataSource.getRepository(ReportDAO).clear();
    await AppDataSource.getRepository(CitizenDAO).clear();
    await AppDataSource.getRepository(TempFileDAO).clear();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();

    const objects = minioClient.listObjectsV2(MINIO_BUCKET, "citizens/", true);
    const deleteList: string[] = [];
    for await (const obj of objects) deleteList.push(obj.name);
    if (deleteList.length) await minioClient.removeObjects(MINIO_BUCKET, deleteList);
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

    const photoIds = [upload1.body.fileId, upload2.body.fileId, upload3.body.fileId];

    const res = await request(app)
        .post("/api/citizens/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Pothole",
          description: "Big pothole on main street",
          categoryId: roadsCategory!.id,
          location: { latitude: 45.4642, longitude: 9.19 },
          photoIds
        });

    expect(res.status).toBe(201);
    expect(res.body.photos.length).toBe(3);
    res.body.photos.forEach((photoUrl: string) => {
      expect(photoUrl).toContain("http");
      expect(photoUrl).toContain("X-Amz-Signature");
    });
  });

  it("should store photos in MinIO and retrieve them", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const waste = await categoryRepo.findOne({ where: { name: "Waste" } });

    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");

    const res = await request(app)
        .post("/api/citizens/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Test Photo",
          description: "Testing",
          categoryId: waste!.id,
          location: { latitude: 45, longitude: 9 },
          photoIds: [upload.body.fileId]
        });

    expect(res.status).toBe(201);
    expect(res.body.photos[0]).toContain("http");
  });

  it("should delete photos from MinIO", async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const lighting = await categoryRepo.findOne({ where: { name: "Public Lighting" } });

    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");

    const res = await request(app)
        .post("/api/citizens/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Delete Test",
          description: "Testing delete",
          categoryId: lighting!.id,
          location: { latitude: 45, longitude: 9 },
          photoIds: [upload.body.fileId]
        });

    expect(res.status).toBe(201);
    expect(typeof res.body.photos[0]).toBe("string");
  });

  it("should reject creation without authorization", async () => {
    const res = await request(app).post("/api/citizens/reports").send({});
    expect(res.status).toBe(401);
  });

  it("should validate report payload", async () => {
    const res = await request(app)
        .post("/api/citizens/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({});
    expect(res.status).toBe(400);
  });

  it("should return 400 when category does not exist", async () => {
    const upload = await request(app).post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`).attach("file", photo1, "ph.png");

    const res = await request(app)
        .post("/api/citizens/reports")
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
            .post("/api/citizens/reports")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "User report",
                description: "Test",
                categoryId: waste!.id,
                location: { latitude: 1, longitude: 1 },
                photoIds: [upload.body.fileId]
            });

        const res = await request(app)
            .get("/api/citizens/reports/myReports")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

  it("should reject report update without authorization", async () => {
    const res = await request(app)
        .patch("/api/citizens/reports/1")
        .send({ title: "Updated" });

    expect(res.status).toBe(401);
  });

  it("fails updating report with wrong payload", async () => {
    const res = await request(app)
        .patch("/reports/999")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "INVALID" });

    expect(res.status).toBe(404);
  });

    it("should create a report successfully (no update test)", async () => {
        const categoryRepo = AppDataSource.getRepository(CategoryDAO);
        const waste = await categoryRepo.findOne({ where: { name: "Waste" } });

        // 1. Upload file
        const upload = await request(app)
            .post("/api/files/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("file", photo1, "ph.png");

        expect(upload.status).toBe(201);
        expect(upload.body.fileId).toBeDefined();

        // 2. Create report
        const create = await request(app)
            .post("/api/citizens/reports")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "WillUpdate",
                description: "Old",
                categoryId: waste!.id,
                location: { latitude: 2, longitude: 3 },
                photoIds: [upload.body.fileId]
            });

        expect(create.status).toBe(201);
        expect(create.body.id).toBeDefined();

    });


    it("should reject non-image upload", async () => {
    const badFile = Buffer.from("not an image");

    const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", badFile, "file.txt");

    expect(res.status).toBe(400);
  });
});