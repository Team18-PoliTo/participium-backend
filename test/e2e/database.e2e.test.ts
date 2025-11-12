import { AppDataSource, initializeDatabase, closeDatabase } from "../../src/config/database";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import * as bcrypt from "bcrypt";

describe("Database E2E Tests", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should initialize database connection successfully", async () => {
    expect(AppDataSource.isInitialized).toBe(true);
  });

  it("should have created default roles", async () => {
    const roleRepo = AppDataSource.getRepository(RoleDAO);
    const roles = await roleRepo.find();
    
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.map(r => r.role)).toEqual(
      expect.arrayContaining(["TBD", "ADMIN", "PRO", "TOS", "ET"])
    );
  });

  it("should have created default admin user", async () => {
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    const admin = await userRepo.findOne({
      where: { email: "admin@admin.com" },
      relations: ["role"]
    });

    expect(admin).toBeDefined();
    expect(admin?.firstName).toBe("AdminFirstName");
    expect(admin?.lastName).toBe("AdminLastName");
    expect(admin?.role.role).toBe("ADMIN");
    expect(admin?.status).toBe("ACTIVE");

    // Verify password
    const isValidPassword = await bcrypt.compare("password", admin!.password);
    expect(isValidPassword).toBe(true);
  });

  it("should not create duplicate admin user on re-initialization", async () => {
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    const beforeCount = await userRepo.count();
    
    // Try to initialize again
    await initializeDatabase();
    
    const afterCount = await userRepo.count();
    expect(afterCount).toBe(beforeCount); // No new users should be created
  });
});