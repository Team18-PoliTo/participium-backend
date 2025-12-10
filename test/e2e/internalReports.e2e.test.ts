import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import ReportDAO from "../../src/models/dao/ReportDAO";
import OfficeDAO from "../../src/models/dao/OfficeDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import CategoryDAO from "../../src/models/dao/CategoryDAO";
import CategoryRoleDAO from "../../src/models/dao/CategoryRoleDAO";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import { ReportStatus } from "../../src/constants/ReportStatus";

jest.mock("../../src/config/initMinio", () => ({
  initMinio: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/services/MinIoService", () => ({
  __esModule: true,
  default: {
    getPresignedUrl: jest.fn().mockResolvedValue("http://mock-url"),
  },
}));

describe("Internal Reports E2E Tests", () => {
  let staffToken: string;
  let staffId: number;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);

    const officeRepo = AppDataSource.getRepository(OfficeDAO);
    const roleRepo = AppDataSource.getRepository(RoleDAO);
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const catRoleRepo = AppDataSource.getRepository(CategoryRoleDAO);
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    const reportRepo = AppDataSource.getRepository(ReportDAO);

    const office = await officeRepo.save({
      name: "Tech Office",
      description: "Technical",
    });

    const role = await roleRepo.save({ role: "Tech Operator", office });

    const category = await categoryRepo.save({
      name: "Tech Issues",
      description: "Tech stuff",
    });

    await catRoleRepo.save({ category, role });

    const staff = await userRepo.save({
      email: "staff@city.com",
      firstName: "Staff",
      lastName: "Member",
      password: "pass",
      role: role,
      status: "ACTIVE",
    });
    staffId = staff.id;

    staffToken = jwt.sign(
      { sub: staff.id, kind: "internal", email: staff.email, role: role.role },
      process.env.JWT_SECRET || "dev-secret"
    );

    const citizen = await citizenRepo.save({
      email: "c@c.com",
      username: "c",
      firstName: "C",
      lastName: "Z",
      password: "p",
    });

    await reportRepo.save({
      title: "Assigned Report",
      description: "Desc",
      location: JSON.stringify({ lat: 1, lng: 1 }),
      status: ReportStatus.ASSIGNED,
      citizen,
      category,
      assignedTo: staff,
    });

    await reportRepo.save({
      title: "Office Report",
      description: "Desc",
      location: JSON.stringify({ lat: 1, lng: 1 }),
      status: ReportStatus.PENDING_APPROVAL,
      citizen,
      category,
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  describe("GET /api/internal/reports/assigned", () => {
    it("should return reports assigned to the logged-in staff", async () => {
      const res = await request(app)
        .get("/api/internal/reports/assigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Assigned Report");
      expect(res.body[0].assignedTo.id).toBe(staffId);
    });

    it("should return 401 without token", async () => {
      await request(app).get("/api/internal/report/assigned").expect(401);
    });
  });

  describe("GET /api/internal/reports/by-office", () => {
    it("should return reports related to the staff's office categories", async () => {
      const res = await request(app)
        .get("/api/internal/reports/by-office")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const titles = res.body.map((r: any) => r.title);
      expect(titles).toContain("Assigned Report");
      expect(titles).toContain("Office Report");
    });

    it("should reject PR Officers (403)", async () => {
      const prToken = jwt.sign(
        { sub: 999, kind: "internal", role: "Public Relations Officer" },
        process.env.JWT_SECRET || "dev-secret"
      );

      const res = await request(app)
        .get("/api/internal/reports/by-office")
        .set("Authorization", `Bearer ${prToken}`);

      expect(res.status).toBe(403);
    });
  });
});
