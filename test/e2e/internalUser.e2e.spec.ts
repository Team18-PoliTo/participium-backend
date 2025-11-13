import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("Internal User Management E2E Tests", () => {
  let adminToken: string;
  let adminId: number;
  let proRoleId: number;
  let tosRoleId: number;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const roleRepo = AppDataSource.getRepository(RoleDAO);
    const userRepo = AppDataSource.getRepository(InternalUserDAO);

    // 1) ensure roles exist (idempotent)
    for (const name of ["ADMIN", "PRO", "TOS"] as const) {
      const found = await roleRepo.findOne({ where: { role: name as any } });
      if (!found) {
        await roleRepo.save(roleRepo.create({ role: name as any }));
      }
    }

    // 2) fetch roles we need
    const adminRole = await roleRepo.findOne({ where: { role: "ADMIN" as any } });
    const proRole   = await roleRepo.findOne({ where: { role: "PRO"   as any } });
    const tosRole   = await roleRepo.findOne({ where: { role: "TOS"   as any } });
    if (!adminRole || !proRole || !tosRole) {
      throw new Error("Failed to seed roles ADMIN/PRO/TOS");
    }
    proRoleId = proRole.id;
    tosRoleId = tosRole.id;

    // 3) ensure admin user exists and is ADMIN
    let adminUser = await userRepo.findOne({
      where: { email: "admin@admin.com" },
      relations: ["role"],
    });

    if (!adminUser) {
      adminUser = await userRepo.save(
          Object.assign(new InternalUserDAO(), {
            firstName: "Admin",
            lastName: "User",
            email: "admin@admin.com",
            password: await bcrypt.hash("admin123", 10),
            role: adminRole,
            status: "ACTIVE",
          })
      );
    } else if (!adminUser.role || adminUser.role.id !== adminRole.id) {
      adminUser.role = adminRole;
      await userRepo.save(adminUser);
    }

    adminId = adminUser.id;

    // 4) sign token exactly as middleware expects (role: 'ADMIN')
    const secret = process.env.JWT_SECRET || "dev-secret";
    adminToken = jwt.sign(
        {
          sub: adminId,
          kind: "internal",
          email: adminUser.email,
          role: "ADMIN", // <— ключевая правка
        },
        secret,
        { expiresIn: "1h" }
    );

    // console.log('payload:', jwt.decode(adminToken));
  });

  beforeEach(async () => {
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    await userRepo.delete({ email: "testuser@example.com" });
    await userRepo.delete({ email: "updated@example.com" });
    await userRepo.delete({ email: "todelete@example.com" });
  });

  afterAll(async () => {
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    await userRepo.delete({ email: "testuser@example.com" });
    await userRepo.delete({ email: "updated@example.com" });
    await userRepo.delete({ email: "todelete@example.com" });
    await AppDataSource.destroy();
  });

  describe("Create Internal User", () => {

    it("should reject duplicate email", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "admin@admin.com",
        password: "password123",
        roleId: proRoleId,
      };

      const res = await request(app)
          .post("/api/admin/internal-users")
          .set("Authorization", `Bearer ${adminToken}`)
          .send(userData);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty(
          "error",
          "InternalUser with this email already exists"
      );
    });

    it("should validate required fields", async () => {
      const res = await request(app)
          .post("/api/admin/internal-users")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ firstName: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Update Internal User", () => {
    let testUserId: number;

    beforeEach(async () => {
      const userRepo = AppDataSource.getRepository(InternalUserDAO);
      const roleRepo = AppDataSource.getRepository(RoleDAO);
      const proRole = await roleRepo.findOne({ where: { id: proRoleId } });
      if (!proRole) throw new Error("PRO role not found");

      const testUser = new InternalUserDAO();
      testUser.firstName = "Original";
      testUser.lastName = "User";
      testUser.email = "testuser@example.com";
      testUser.password = await bcrypt.hash("password123", 10);
      testUser.role = proRole;
      testUser.status = "ACTIVE";

      const savedUser = await userRepo.save(testUser);
      testUserId = savedUser.id;
    });

    it("should update user with valid data", async () => {
      const res = await request(app)
          .put(`/api/admin/internal-users/${testUserId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            newFirstName: "Updated",
            newLastName: "Name",
            newEmail: "updated@example.com",
            roleId: tosRoleId,
          });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe("Updated");
      expect(res.body.lastName).toBe("Name");
      expect(res.body.email).toBe("updated@example.com");
    });

    it("should reject invalid user ID", async () => {
      const res = await request(app)
          .put("/api/admin/internal-users/invalid-id")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ firstName: "Test" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid ID format");
    });
  });

  describe("Fetch Internal Users", () => {
    it("should fetch all internal users", async () => {
      const res = await request(app)
          .get("/api/admin/internal-users")
          .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("email");
      expect(res.body[0]).toHaveProperty("firstName");
      expect(res.body[0]).toHaveProperty("role");
    });
  });

  describe("Delete Internal User", () => {
    let testUserId: number;

    beforeEach(async () => {
      const userRepo = AppDataSource.getRepository(InternalUserDAO);
      const roleRepo = AppDataSource.getRepository(RoleDAO);
      const proRole = await roleRepo.findOne({ where: { id: proRoleId } });
      if (!proRole) throw new Error("PRO role not found");

      const testUser = new InternalUserDAO();
      testUser.firstName = "ToDelete";
      testUser.lastName = "User";
      testUser.email = "todelete@example.com";
      testUser.password = await bcrypt.hash("password123", 10);
      testUser.role = proRole;
      testUser.status = "ACTIVE";

      const savedUser = await userRepo.save(testUser);
      testUserId = savedUser.id;
    });

    it("should disable user by ID", async () => {
      const res = await request(app)
          .delete(`/api/admin/internal-users/${testUserId}`)
          .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const userRepo = AppDataSource.getRepository(InternalUserDAO);
      const disabledUser = await userRepo.findOne({
        where: { id: testUserId },
        relations: ["role"],
      });
      expect(disabledUser?.status).toBe("DEACTIVATED");
    });

    it("should reject deleting own account", async () => {
      const res = await request(app)
          .delete(`/api/admin/internal-users/${adminId}`)
          .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty(
          "message",
          "You cannot delete your own account"
      );
    });

    it("should handle non-existent user", async () => {
      const res = await request(app)
          .delete("/api/admin/internal-users/99999")
          .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Internal user not found");
    });

    it("should reject invalid user ID", async () => {
      const res = await request(app)
          .delete("/api/admin/internal-users/invalid")
          .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
          "message",
          "Invalid internal user id"
      );
    });
  });
});