import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import * as bcrypt from "bcrypt";
import RoleDAO from "../../src/models/dao/RoleDAO";

describe("Authentication E2E Tests", () => {
  let _citizenId: number;
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
      if (!exists) {
        await roleRepo.save(role);
      }
    }
  });

  beforeEach(async () => {
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    const internalRepo = AppDataSource.getRepository(InternalUserDAO);

    await citizenRepo.clear();
    await internalRepo.clear();

    const _citizen = await citizenRepo.save({
      email: "testcitizen@example.com",
      username: "testcitizen",
      password: await bcrypt.hash("password123", 10),
      firstName: "Test",
      lastName: "Citizen",
      status: "ACTIVE",
    });

    const testRole = await roleRepo.findOne({ where: { id: 99 } });
    if (!testRole) {
      throw new Error("Required test role not found");
    }

    const internalUser = await internalRepo.save({
      email: "testinternal@example.com",
      firstName: "Test",
      lastName: "Internal",
      password: await bcrypt.hash("password123", 10),
      status: "ACTIVE",
      role: testRole,
    });
    internalUserId = internalUser.id;
  });

  afterEach(async () => {
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    const internalRepo = AppDataSource.getRepository(InternalUserDAO);

    await citizenRepo.clear();
    await internalRepo.delete({ id: internalUserId });
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("Citizen Authentication", () => {
    it("should login citizen with valid credentials", async () => {
      const res = await request(app).post("/api/auth/citizens/login").send({
        email: "testcitizen@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
    });

    it("should reject citizen login with invalid credentials", async () => {
      const res = await request(app).post("/api/auth/citizens/login").send({
        email: "testcitizen@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Invalid credentials");
    });

    it("should validate login request DTO", async () => {
      const res = await request(app).post("/api/auth/citizens/login").send({
        email: "invalid-email",
        password: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Internal User Authentication", () => {
    it("should login internal user with valid credentials", async () => {
      const res = await request(app).post("/api/auth/internal/login").send({
        email: "testinternal@example.com",
        password: "password123",
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
    });

    it("should reject internal user login with invalid credentials", async () => {
      const res = await request(app).post("/api/auth/internal/login").send({
        email: "testinternal@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Invalid credentials");
    });
  });

  describe("Logout", () => {
    it("should logout successfully", async () => {
      const loginRes = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: "testcitizen@example.com",
          password: "password123",
        });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.body.access_token || loginRes.body.token;
      expect(accessToken).toBeDefined();
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Logged out successfully");
    });
  });

  describe("Get Current User", () => {
    let citizenToken: string;
    let internalToken: string;

    it("should get citizen profile with valid token", async () => {
      const citizenRes = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: "testcitizen@example.com",
          password: "password123",
        });

      expect(citizenRes.status).toBe(200);
      citizenToken = citizenRes.body.access_token || citizenRes.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("kind", "citizen");
      expect(res.body).toHaveProperty("profile");
    });

    it("should get internal user profile with valid token", async () => {
      const internalRes = await request(app)
        .post("/api/auth/internal/login")
        .send({
          email: "testinternal@example.com",
          password: "password123",
        });

      expect(internalRes.status).toBe(200);
      internalToken = internalRes.body.access_token || internalRes.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${internalToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("kind", "internal");
      expect(res.body).toHaveProperty("profile");
    });

    it("should reject request without token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty(
        "message",
        "Unauthorized (missing token)"
      );
    });

    it("should handle non-existent user gracefully", async () => {
      const jwt = require("jsonwebtoken");
      const fakeToken = jwt.sign(
        { sub: 99999, kind: "citizen", email: "nonexistent@example.com" },
        process.env.JWT_SECRET ?? "dev-secret"
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Citizen not found");
    });
  });
});
