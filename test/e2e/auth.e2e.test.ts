import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import * as bcrypt from "bcrypt";

const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "password123";
const TEST_WRONG_PASSWORD = process.env.TEST_WRONG_PASSWORD ?? "wrongpassword";

const loginCitizen = () =>
  request(app).post("/api/auth/citizens/login").send({
    email: "testcitizen@example.com",
    password: TEST_PASSWORD,
  });

const loginInternal = () =>
  request(app).post("/api/auth/internal/login").send({
    email: "testinternal@example.com",
    password: TEST_PASSWORD,
  });

async function resetDatabase() {
  const citizenRepo = AppDataSource.getRepository(CitizenDAO);
  const internalRepo = AppDataSource.getRepository(InternalUserDAO);
  await citizenRepo.clear();
  await internalRepo.clear();
}

async function seedUsers(roleRepo: any) {
  const citizenRepo = AppDataSource.getRepository(CitizenDAO);
  const internalRepo = AppDataSource.getRepository(InternalUserDAO);

  await citizenRepo.save({
    email: "testcitizen@example.com",
    username: "testcitizen",
    password: await bcrypt.hash(TEST_PASSWORD, 10),
    firstName: "Test",
    lastName: "Citizen",
    status: "ACTIVE",
  });

  const testRole = await roleRepo.findOne({ where: { id: 99 } });
  if (!testRole) throw new Error("Required test role not found");

  const internalUser = await internalRepo.save({
    email: "testinternal@example.com",
    firstName: "Test",
    lastName: "Internal",
    password: await bcrypt.hash(TEST_PASSWORD, 10),
    status: "ACTIVE",
    role: testRole,
  });

  return internalUser.id;
}

describe("Authentication E2E Tests", () => {
  let internalUserId: number;
  let roleRepo = AppDataSource.getRepository(RoleDAO);

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);

    roleRepo = AppDataSource.getRepository(RoleDAO);

    const baseRoles = [
      { id: 0, role: "Unassigned" },
      { id: 1, role: "ADMIN" },
      { id: 2, role: "Municipal Administrator" },
      { id: 3, role: "Municipal Public Relations Officer" },
      { id: 4, role: "Technical Office Staff" },
      { id: 99, role: "Test Internal Role" },
    ];

    for (const role of baseRoles) {
      const exists = await roleRepo.findOne({ where: { id: role.id } });
      if (!exists) await roleRepo.save(role);
    }
  });

  beforeEach(async () => {
    await resetDatabase();
    internalUserId = await seedUsers(roleRepo);
  });

  afterEach(async () => {
    await resetDatabase();
    const internalRepo = AppDataSource.getRepository(InternalUserDAO);
    await internalRepo.delete({ id: internalUserId });
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("Citizen Authentication", () => {
    it("should login citizen with valid credentials", async () => {
      const res = await loginCitizen();
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
    });

    it("should reject citizen login with invalid credentials", async () => {
      const res = await request(app).post("/api/auth/citizens/login").send({
        email: "testcitizen@example.com",
        password: TEST_WRONG_PASSWORD,
      });
      expect(res.status).toBe(401);
    });

    it("should validate login request DTO", async () => {
      const res = await request(app).post("/api/auth/citizens/login").send({
        email: "invalid-email",
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("Internal User Authentication", () => {
    it("should login internal user with valid credentials", async () => {
      const res = await loginInternal();
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
    });

    it("should reject internal user login with invalid credentials", async () => {
      const res = await request(app).post("/api/auth/internal/login").send({
        email: "testinternal@example.com",
        password: TEST_WRONG_PASSWORD,
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Logout", () => {
    it("should logout successfully", async () => {
      const loginRes = await loginCitizen();
      const token = loginRes.body.access_token;

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("Get Current User", () => {
    it("should get citizen profile with valid token", async () => {
      const loginRes = await loginCitizen();
      const token = loginRes.body.access_token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.kind).toBe("citizen");
    });

    it("should get internal user profile with valid token", async () => {
      const loginRes = await loginInternal();
      const token = loginRes.body.access_token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.kind).toBe("internal");
    });

    it("should reject request without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should handle non-existent user gracefully", async () => {
      const jwt = require("jsonwebtoken");
      const fakeToken = jwt.sign(
        { sub: 99999, kind: "citizen", email: "ghost@example.com" },
        process.env.JWT_SECRET ?? "dev-secret"
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });
});
