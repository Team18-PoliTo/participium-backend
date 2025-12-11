import request from "supertest";
import express, { Express } from "express";
import { AppDataSource } from "../../src/config/database";
import adminRouter from "../../src/routes/adminRoutes";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";

let app: Express;

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.synchronize(true);

  const roleRepo = AppDataSource.getRepository(RoleDAO);
  await roleRepo.save({
    id: 0,
    role: "Unassigned",
  });

  app = express();
  app.use(express.json());
  app.use("/", adminRouter);
});

beforeEach(async () => {
  const repo = AppDataSource.getRepository(InternalUserDAO);
  await repo.clear();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "StrongPass123";

describe("InternalUser E2E (real DB)", () => {
  const validInternalUser = {
    email: "employee@example.com",
    firstName: "Alice",
    lastName: "Smith",
    password: TEST_PASSWORD,
  };

  test("POST / → should register a new internal user", async () => {
    const res = await request(app)
      .post("/")
      .send(validInternalUser)
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe(validInternalUser.email);
    expect(res.body.firstName).toBe(validInternalUser.firstName);
    expect(res.body.status).toBe("ACTIVE");
  });

  test("POST / → should fail when email already exists", async () => {
    await request(app).post("/").send(validInternalUser);

    const res = await request(app)
      .post("/")
      .send({
        ...validInternalUser,
        firstName: "Bob",
      })
      .expect(409);

    expect(res.body.error).toBe("InternalUser with this email already exists");
  });

  test("PUT /:id → should update first name and last name", async () => {
    const created = await request(app)
      .post("/")
      .send(validInternalUser)
      .expect(201);

    const res = await request(app)
      .put(`/${created.body.id}`)
      .send({
        newFirstName: "UpdatedFirst",
        newLastName: "UpdatedLast",
      })
      .expect(200);

    expect(res.body.firstName).toBe("UpdatedFirst");
    expect(res.body.lastName).toBe("UpdatedLast");
    expect(res.body.status).toBe("ACTIVE");
  });

  test("PUT /:id → should fail for invalid id", async () => {
    const res = await request(app)
      .put("/notanumber")
      .send({
        newFirstName: "Fail",
      })
      .expect(400);

    expect(res.body.error).toBe("Invalid ID format");
  });
});
