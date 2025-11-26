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

describe("Citizen Update E2E", () => {

  test("PATCH /:id → should return 400 for invalid ID", async () => {
    const res = await request(app)
        .patch("/abc") // invalid param
        .send({ firstName: "New" })
        .expect(400);

    expect(res.body.error).toBe("Invalid citizen ID");
  });

  test("PATCH /:id → should return 404 if citizen not found", async () => {
    const res = await request(app)
        .patch("/9999") // nonexistent
        .send({ firstName: "Ghost" })
        .expect(404);

    expect(res.body.error).toBe("Citizen not found");
  });

  test("PATCH /:id → should update citizen fields successfully", async () => {
    const created = await request(app)
        .post("/register")
        .send({
          email: "aaa@example.com",
          username: "aaa",
          firstName: "A",
          lastName: "A",
          password: "aaaaaa",
        })
        .expect(201);

    const id = created.body.id;

    const res = await request(app)
        .patch(`/${id}`)
        .send({
          firstName: "Updated",
          lastName: "Person",
          telegramUsername: "telegram123",
          emailNotificationsEnabled: true,
        })
        .expect(200);

    expect(res.body.firstName).toBe("Updated");
    expect(res.body.lastName).toBe("Person");
    expect(res.body.telegramUsername).toBeUndefined();
    expect(res.body.emailNotificationsEnabled).toBeUndefined();
  });


  test("PATCH /:id → should upload accountPhoto via multipart/form-data", async () => {
    const created = await request(app)
        .post("/register")
        .send({
          email: "bbb@example.com",
          username: "bbb",
          firstName: "B",
          lastName: "B",
          password: "bbbbbb",
        })
        .expect(201);

    const id = created.body.id;

    const res = await request(app)
        .patch(`/${id}`)
        .field("firstName", "PhotoUser")
        .attach("accountPhoto", Buffer.from("12345"), "test.png")
        .expect(200);

    expect(res.body.firstName).toBe("PhotoUser");
    expect(res.body.photo).toBeUndefined();
    expect(res.body.photoUrl).toBeUndefined();
    expect(res.body.photoPath).toBeUndefined();
  });

  test("PATCH /:id → invalid email is accepted (no validation)", async () => {
    const created = await request(app)
        .post("/register")
        .send({
          email: "ccc@example.com",
          username: "ccc",
          firstName: "C",
          lastName: "C",
          password: "cccccc",
        })
        .expect(201);

    const id = created.body.id;

    const res = await request(app)
        .patch(`/${id}`)
        .send({ email: "bad_email" })
        .expect(200);

    expect(res.body.email).toBe("bad_email");
  });
});
