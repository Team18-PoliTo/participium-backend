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

    // Get roles
    const roleRepo = AppDataSource.getRepository(RoleDAO);
    const roles = await roleRepo.find();
    proRoleId = roles.find(r => r.role === "PRO")!.id;
    tosRoleId = roles.find(r => r.role === "TOS")!.id;

    // Get admin user from database to create a valid token
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    const adminUser = await userRepo.findOne({ 
      where: { email: "admin@admin.com" },
      relations: ["role"]
    });

    if (!adminUser) {
      throw new Error("Admin user not found in database");
    }

    adminId = adminUser.id;

    // Create a valid JWT token manually to ensure it's correct
    adminToken = jwt.sign(
      { 
        sub: adminId, 
        kind: "internal", 
        email: "admin@admin.com",
        role: adminUser.role.role
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1h" }
    );

    console.log('Created admin token for user:', {
      id: adminId,
      email: "admin@admin.com", 
      role: adminUser.role.role
    });
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
    it("should create new internal user with valid data", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User", 
        email: "testuser@example.com",
        password: "password123",
        roleId: proRoleId
      };

      const res = await request(app)
        .post("/api/admin/internal-users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(userData);

      console.log('Create user response status:', res.status);
      if (res.status !== 201) {
        console.log('Create user error:', res.body);
      }
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe("testuser@example.com");
      expect(res.body.firstName).toBe("Test");
      expect(res.body.lastName).toBe("User");
    });

    it("should reject duplicate email", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "admin@admin.com", 
        password: "password123", 
        roleId: proRoleId
      };

      const res = await request(app)
        .post("/api/admin/internal-users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(userData);

      console.log('Duplicate email response status:', res.status);
      
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error", "InternalUser with this email already exists");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        firstName: "Test",
      };

      const res = await request(app)
        .post("/api/admin/internal-users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      console.log('Validation response status:', res.status);
      
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
      
      if (!proRole) {
        throw new Error("PRO role not found");
      }

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
      const updateData = {
        newFirstName: "Updated",
        newLastName: "Name",
        newEmail: "updated@example.com",
        roleId: tosRoleId
      };

      const res = await request(app)
        .put(`/api/admin/internal-users/${testUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      console.log(res.body);
      
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

      console.log('Invalid ID response status:', res.status);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Invalid ID format");
    });
  });

  describe("Fetch Internal Users", () => {
    it("should fetch all internal users", async () => {
      const res = await request(app)
        .get("/api/admin/internal-users")
        .set("Authorization", `Bearer ${adminToken}`);

      console.log('Fetch users response status:', res.status);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Should at least have the admin user
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
      
      if (!proRole) {
        throw new Error("PRO role not found");
      }

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

      console.log('Delete user response status:', res.status);
      
      expect(res.status).toBe(204);

      const userRepo = AppDataSource.getRepository(InternalUserDAO);
      const disabledUser = await userRepo.findOne({ 
        where: { id: testUserId },
        relations: ["role"]
      });
      expect(disabledUser?.status).toBe("DEACTIVATED");
    });

    it("should reject deleting own account", async () => {
      const res = await request(app)
        .delete(`/api/admin/internal-users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      console.log('Delete own account response status:', res.status);
      
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message", "You cannot delete your own account");
    });

    it("should handle non-existent user", async () => {
      const res = await request(app)
        .delete("/api/admin/internal-users/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      console.log('Non-existent user response status:', res.status);
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Internal user not found");
    });

    it("should reject invalid user ID", async () => {
      const res = await request(app)
        .delete("/api/admin/internal-users/invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      console.log('Invalid user ID response status:', res.status);
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message", "Invalid internal user id");
    });
  });
});