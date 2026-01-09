import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app";
import * as bcrypt from "bcrypt";
import { AppDataSource } from "../../src/config/database";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import ReportDAO from "../../src/models/dao/ReportDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import CompanyDAO from "../../src/models/dao/CompanyDAO";
import CategoryDAO from "../../src/models/dao/CategoryDAO";
import CitizenDAO from "../../src/models/dao/CitizenDAO";
import { ReportStatus } from "../../src/constants/ReportStatus";

jest.mock("../../src/config/initMinio", () => ({
  initMinio: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/services/MinIoService", () => ({
  __esModule: true,
  default: {
    getPresignedUrl: jest.fn().mockResolvedValue("https://mock-url"),
  },
}));

const TEST_SHORT_PASSWORD = process.env.TEST_SHORT_PASSWORD ?? "p";

describe("External Maintainer Workflow E2E", () => {
  let maintainerToken: string;
  let assignedReportId: number;
  let otherReportId: number;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);

    const roleRepo = AppDataSource.getRepository(RoleDAO);
    const userRepo = AppDataSource.getRepository(InternalUserDAO);
    const companyRepo = AppDataSource.getRepository(CompanyDAO);
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    const reportRepo = AppDataSource.getRepository(ReportDAO);
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);

    const maintainerRole = await roleRepo.save({
      id: 28,
      role: "External Maintainer",
    });
    const techRole = await roleRepo.save({
      id: 4,
      role: "Technical Office Staff",
    });

    const company = await companyRepo.save({
      name: "FixIt Fast",
      email: "contact@fixit.com",
      description: "General Maintenance",
    });

    const maintainer = await userRepo.save({
      email: "maintainer@fixit.com",
      firstName: "Bob",
      lastName: "Builder",
      password: await bcrypt.hash("test-password", 10),
      roles: [{ role: maintainerRole }],
      company,
      status: "ACTIVE",
    });

    const otherUser = await userRepo.save({
      email: "tech@city.com",
      firstName: "Tech",
      lastName: "Guy",
      password: await bcrypt.hash("test-password", 10),
      roles: [{ role: techRole }],
      status: "ACTIVE",
    });

    maintainerToken = jwt.sign(
      {
        sub: maintainer.id,
        kind: "internal",
        email: maintainer.email,
        roles: [maintainerRole.role],
      },
      process.env.JWT_SECRET || "dev-secret"
    );

    const category = await categoryRepo.save({
      name: "Potholes",
      description: "Road issues",
    });

    const citizen = await citizenRepo.save({
      email: "c@test.com",
      username: "c",
      firstName: "C",
      lastName: "T",
      password: TEST_SHORT_PASSWORD,
    });

    const assignedReport = await reportRepo.save({
      title: "Assigned Pothole",
      description: "Fix this",
      location: "{}",
      status: ReportStatus.DELEGATED,
      citizen,
      category,
      assignedTo: maintainer,
    });
    assignedReportId = assignedReport.id;

    const otherReport = await reportRepo.save({
      title: "Someone else's problem",
      description: "Not mine",
      location: "{}",
      status: ReportStatus.ASSIGNED,
      citizen,
      category,
      assignedTo: otherUser,
    });
    otherReportId = otherReport.id;
  });

  it("should login as external maintainer", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${maintainerToken}`);

    expect(res.status).toBe(200);

    const roleNames = res.body.profile.roles.map((r: any) => r.name);

    expect(roleNames).toContain("External Maintainer");
  });

  it("GET /api/internal/reports/assigned returns delegated reports", async () => {
    const res = await request(app)
      .get("/api/internal/reports/assigned")
      .set("Authorization", `Bearer ${maintainerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(assignedReportId);
    expect(res.body[0].status).toBe(ReportStatus.DELEGATED);
  });

  it("PATCH /api/internal/reports/:id updates status DELEGATED -> IN_PROGRESS", async () => {
    const res = await request(app)
      .patch(`/api/internal/reports/${assignedReportId}`)
      .set("Authorization", `Bearer ${maintainerToken}`)
      .send({
        status: ReportStatus.IN_PROGRESS,
        explanation: "Starting work now.",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ReportStatus.IN_PROGRESS);

    const report = await AppDataSource.getRepository(ReportDAO).findOneBy({
      id: assignedReportId,
    });
    expect(report?.status).toBe(ReportStatus.IN_PROGRESS);
    expect(report?.explanation).toBe("Starting work now.");
  });

  it("PATCH /api/internal/reports/:id updates status IN_PROGRESS -> RESOLVED", async () => {
    const res = await request(app)
      .patch(`/api/internal/reports/${assignedReportId}`)
      .set("Authorization", `Bearer ${maintainerToken}`)
      .send({
        status: ReportStatus.RESOLVED,
        explanation: "Job done.",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ReportStatus.RESOLVED);
  });

  it("should return 403 when updating report not assigned to them", async () => {
    const res = await request(app)
      .patch(`/api/internal/reports/${otherReportId}`)
      .set("Authorization", `Bearer ${maintainerToken}`)
      .send({
        status: ReportStatus.IN_PROGRESS,
        explanation: "Hacking",
      });

    expect([400, 403]).toContain(res.status);
    // External maintainers cannot transition from ASSIGNED (they receive DELEGATED status)
    expect(res.body.error).toMatch(
      /(only the assigned user can transition|External maintainers cannot transition)/i
    );
  });
});
