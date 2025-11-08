import request from "supertest";
import express, { Express } from "express";
import userRouter from "../../src/routes/userRoutes";
import { AppDataSource } from "../../src/config/database";
import UserDAO from "../../src/models/dao/UserDAO";

let app: Express;

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.synchronize(true);

  app = express();
  app.use(express.json());
  app.use("/", userRouter);
});

beforeEach(async () => {
  const repo = AppDataSource.getRepository(UserDAO);
  await repo.clear();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

describe("User Registration E2E (real DB)", () => {
  const validUser = {
    email: "john@example.com",
    username: "johnny",
    firstName: "John",
    lastName: "Doe",
    password: "strongpass",
  };

  test("POST /register → should register a new user", async () => {
    const res = await request(app)
      .post("/register")
      .send(validUser)
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe(validUser.email);
    expect(res.body.username).toBe(validUser.username);
  });

  test("POST /register → should fail when email already exists", async () => {
    await request(app).post("/register").send(validUser);

    const res = await request(app)
      .post("/register")
      .send({
        ...validUser,
        username: "different",
      })
      .expect(409);

    expect(res.body.error).toBe("User with this email already exists");
  });

  test("POST /register → should fail when username already exists", async () => {
    await request(app).post("/register").send(validUser);

    const res = await request(app)
      .post("/register")
      .send({
        ...validUser,
        email: "another@example.com",
      })
      .expect(409);

    expect(res.body.error).toBe("User with this username already exists");
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
