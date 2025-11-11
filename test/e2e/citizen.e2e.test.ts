import request from "supertest";
import express, { Express } from "express";
import citizenRouter from "../../src/routes/citizenRoutes";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";

let app: Express;

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.synchronize(true);

  app = express();
  app.use(express.json());
  app.use("/", citizenRouter);
});

beforeEach(async () => {
  const repo = AppDataSource.getRepository(CitizenDAO);
  await repo.clear();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

describe("Citizen Registration E2E (real DB)", () => {
  const validCitizen = {
    email: "john@example.com",
    username: "johnny",
    firstName: "John",
    lastName: "Doe",
    password: "strongpass",
  };

  test("POST /register → should register a new citizen", async () => {
    const res = await request(app)
      .post("/register")
      .send(validCitizen)
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe(validCitizen.email);
    expect(res.body.username).toBe(validCitizen.username);
    expect(res.body.status).toBe("ACTIVE");
  });

  test("POST /register → should fail when email already exists", async () => {
    await request(app).post("/register").send(validCitizen);

    const res = await request(app)
      .post("/register")
      .send({
        ...validCitizen,
        username: "different",
      })
      .expect(409);

    expect(res.body.error).toBe("Citizen with this email already exists");
  });

  test("POST /register → should fail when username already exists", async () => {
    await request(app).post("/register").send(validCitizen);

    const res = await request(app)
      .post("/register")
      .send({
        ...validCitizen,
        email: "another@example.com",
      })
      .expect(409);

    expect(res.body.error).toBe("Citizen with this username already exists");
  });

  test("POST /register → should fail validation for invalid data", async () => {
    const res = await request(app)
      .post("/register")
      .send({
        email: "not-an-email",
        username: "ab",
        firstName: "",
        lastName: "",
        password: "123",
      })
      .expect(400);

    expect(res.body.error).toMatch(/Invalid email format/);
    expect(res.body.error).toMatch(/Username must be at least 3 characters/);
    expect(res.body.error).toMatch(/Password must be at least 6 characters/);
  });
});
