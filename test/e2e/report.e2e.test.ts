import request from "supertest";
import app from "../../src/app";
import { initMinio } from "../../src/config/initMinio";
import MinIoService from "../../src/services/MinIoService";
import { minioClient, MINIO_BUCKET } from "../../src/config/minioClient";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import ReportDAO from "../../src/models/dao/ReportDAO";
import CategoryDAO from "../../src/models/dao/CategoryDAO"; 

describe("Report E2E Tests (real DB + MinIO)", () => {
  let citizenId: number;
  let token: string;

  // Use raw binary data for testing MinIO
  const photo1 = Buffer.from("test1");
  const photo2 = Buffer.from("test2"); 
  const photo3 = Buffer.from("test3");

  // Convert to base64 for JSON API
  const photo1Base64 = photo1.toString('base64');
  const photo2Base64 = photo2.toString('base64');
  const photo3Base64 = photo3.toString('base64');

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await initMinio();
    
    // Seed required categories for tests
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const categories = [
      { name: "Roads and Urban Furnishings", description: "Strade e Arredi Urbani" },
      { name: "Waste", description: "Rifiuti" },
      { name: "Public Lighting", description: "Illuminazione Pubblica" }
    ];
    
    for (const cat of categories) {
      const existing = await categoryRepo.findOne({ where: { name: cat.name } });
      if (!existing) {
        await categoryRepo.save(cat);
      }
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
    const reportRepo = AppDataSource.getRepository(ReportDAO);
    await reportRepo.clear();
    
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    await citizenRepo.clear();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();

    const objectsStream = minioClient.listObjectsV2(MINIO_BUCKET, "citizens/", true);
    const deleteList: string[] = [];
    for await (const obj of objectsStream) {
      deleteList.push(obj.name);
    }
    if (deleteList.length) await minioClient.removeObjects(MINIO_BUCKET, deleteList);
  });

  it("should create a report with 3 photos", async () => {
    const reportData = {
      title: "Pothole",
      description: "Big pothole on main street", 
      category: "Roads and Urban Furnishings",
      location: {
        latitude: 45.4642,
        longitude: 9.1900
      },
      binaryPhoto1: {
        filename: "photo1.png",
        mimetype: "image/png", 
        size: photo1.length,
        data: photo1Base64
      },
      binaryPhoto2: {
        filename: "photo2.png",
        mimetype: "image/png",
        size: photo2.length,
        data: photo2Base64
      },
      binaryPhoto3: {
        filename: "photo3.png", 
        mimetype: "image/png",
        size: photo3.length,
        data: photo3Base64
      }
    };

    const res = await request(app)
      .post("/api/citizens/reports")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send(reportData);

    expect(res.status).toBe(201);
    expect(res.body.photos.length).toBe(3);
    expect(res.body.id).toBeDefined();
    
    for (const photoPath of res.body.photos) {
      const fileBuffer = await MinIoService.getFile(photoPath);
      expect(fileBuffer).toBeDefined();
    }
  });

  it("should store photos in MinIO and retrieve them", async () => {
    const reportData = {
      title: "Test Photo",
      description: "Testing retrieval",
      category: "Waste",
      location: {
        latitude: 45.0,
        longitude: 9.0
      },
      binaryPhoto1: {
        filename: "photo1.png",
        mimetype: "image/png",
        size: photo1.length,
        data: photo1Base64
      }
    };

    const res = await request(app)
      .post("/api/citizens/reports")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send(reportData);

    expect(res.status).toBe(201);
    const body = res.body;
    expect(body.photos.length).toBe(1);

    const fileBuffer = await MinIoService.getFile(body.photos[0]);
    
    
    const fileContent = fileBuffer.toString();
    if (fileContent === "test1") {
      expect(fileContent).toBe("test1");
    } else {
      const decodedContent = Buffer.from(fileContent, 'base64').toString();
      expect(decodedContent).toBe("test1");
    }
  });

  it("should delete photos from MinIO", async () => {
    const reportData = {
      title: "Delete Test", 
      description: "Testing delete",
      category: "Public Lighting",
      location: {
        latitude: 45.0,
        longitude: 9.0
      },
      binaryPhoto1: {
        filename: "photo1.png",
        mimetype: "image/png", 
        size: photo1.length,
        data: photo1Base64
      }
    };

    const res = await request(app)
      .post("/api/citizens/reports")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send(reportData);

    expect(res.status).toBe(201);
    const body = res.body;

    const fileBuffer = await MinIoService.getFile(body.photos[0]);
    expect(fileBuffer).toBeDefined();
    await MinIoService.deleteFile(body.photos[0]);
    await expect(MinIoService.getFile(body.photos[0])).rejects.toThrow();
  });

  it("should reject creation without authorization", async () => {
    const res = await request(app)
      .post("/api/citizens/reports")
      .send({});

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("should validate report payload", async () => {
    const res = await request(app)
      .post("/api/citizens/reports")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 when category does not exist", async () => {
    const res = await request(app)
      .post("/api/citizens/reports")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Ghost report",
        description: "Invalid category",
        category: "NonExistentCategory",
        location: { latitude: 1, longitude: 2 },
        binaryPhoto1: {
          filename: "photo.png",
          mimetype: "image/png",
          size: photo1.length,
          data: photo1Base64,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toContain("Category not found");
  });
});