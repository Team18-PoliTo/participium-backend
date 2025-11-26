import request from "supertest";
import express, { Express } from "express";
import citizenRouter from "../../src/routes/citizenRoutes";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import jwt from "jsonwebtoken";

let app: Express;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

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

describe("Citizen Update E2E", () => {
  const createCitizenAndToken = async () => {
    const created = await request(app)
      .post("/register")
      .send({
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        password: "password123",
      })
      .expect(201);

    const token = jwt.sign(
      { sub: created.body.id, kind: "citizen", email: created.body.email },
      JWT_SECRET
    );

    return { citizen: created.body, token };
  };

  test("PATCH /me → should return 401 when not authenticated", async () => {
    const res = await request(app)
      .patch("/me")
      .send({ firstName: "New" })
      .expect(401);

    expect(res.body).toHaveProperty("message");
  });

  test("PATCH /me → should update citizen fields successfully", async () => {
    const { token } = await createCitizenAndToken();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Updated",
        lastName: "Person",
        telegramUsername: "telegram123",
        emailNotificationsEnabled: true,
      })
      .expect(200);

    expect(res.body.firstName).toBe("Updated");
    expect(res.body.lastName).toBe("Person");
    expect(res.body.telegramUsername).toBe("telegram123");
    expect(res.body.emailNotificationsEnabled).toBe(true);
  });

  test("PATCH /me → should update accountPhoto with photoPath", async () => {
    const { token } = await createCitizenAndToken();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "PhotoUser",
        accountPhoto: "temp/12345/profile.jpg",
      })
      .expect(200);

    expect(res.body.firstName).toBe("PhotoUser");
    expect(res.body.accountPhoto).toBeDefined();
  });

  test("PATCH /me → invalid email is accepted (no validation)", async () => {
    const { token } = await createCitizenAndToken();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "bad_email" })
      .expect(200);

    expect(res.body.email).toBe("bad_email");
  });
});
