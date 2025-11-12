import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import RoleDAO from "../../src/models/dao/RoleDAO";
import jwt from "jsonwebtoken";

describe("Role Management E2E Tests", () => {
  let adminToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const loginRes = await request(app)
      .post("/api/auth/internal/login")
      .send({
        email: "admin@admin.com",
        password: "password"
      });
    console.log(loginRes.body)
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("Get All Roles", () => {
    it("should fetch all available roles", async () => {
      const res = await request(app)
        .get("/api/admin/roles")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const role = res.body[0];
      expect(role).toHaveProperty("id");
      expect(role).toHaveProperty("role");

      const roleNames = res.body.map((r: any) => r.role);
      expect(roleNames).toEqual(
        expect.arrayContaining(["TBD", "ADMIN", "PRO", "TOS", "ET"])
      );
    });

    it("should reject unauthorized access", async () => {
      const res = await request(app)
        .get("/api/admin/roles");

      expect(res.status).toBe(401);
    });
  });
});