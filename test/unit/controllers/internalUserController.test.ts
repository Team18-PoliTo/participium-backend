import InternalUserController from '../../../src/controllers/InternalUserController';
import { Request, Response, NextFunction } from 'express';
import { ReportStatus } from '../../../src/constants/ReportStatus';

// Mock dependencies only (Services)
const mockInternalService = {
  register: jest.fn(),
  update: jest.fn(),
  fetchUsers: jest.fn(),
  disableById: jest.fn(),
};

const mockReportService = {
    getReportsByStatus: jest.fn(),
    updateReport: jest.fn(),
    getReportsForStaff: jest.fn(),
    getReportsByOffice: jest.fn(),
};

const buildController = (withReportService = true) => {
    return new InternalUserController(
        mockInternalService as any, 
        withReportService ? mockReportService as any : undefined
    );
};

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const next: NextFunction = jest.fn();

describe('InternalUserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- CREATE ---
  describe("create", () => {
      const validCreateBody = {
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123'
      };

      it('create sends 201 on success', async () => {
        mockInternalService.register.mockResolvedValue({ id: 1 });
        const req = { body: validCreateBody } as Request;
        const res = mockRes();

        await buildController().create(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ id: 1 });
      });

      it('create returns 400 on validation error (missing fields)', async () => {
          const req = { body: { email: 'test@test.com' } } as Request;
          const res = mockRes();

          await buildController().create(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          // Expect validation error string
          expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({ error: expect.stringContaining("is required") })
          );
      });

      it('create returns 409 when email exists', async () => {
        mockInternalService.register.mockRejectedValue(new Error('InternalUser with this email already exists'));
        const req = { body: validCreateBody } as Request;
        const res = mockRes();

        await buildController().create(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: 'InternalUser with this email already exists' });
      });

      it('create forwards unexpected errors', async () => {
        const boom = new Error('boom');
        mockInternalService.register.mockRejectedValue(boom);
        const req = { body: validCreateBody } as Request;
        const res = mockRes();

        await buildController().create(req, res, next);

        expect(next).toHaveBeenCalledWith(boom);
      });
  });

  // --- UPDATE ---
  describe("update", () => {
      it('update returns 200 on success', async () => {
          mockInternalService.update.mockResolvedValue({ id: 1 });
          const req = { params: { id: '1' }, body: { newFirstName: "Jane" } } as unknown as Request;
          const res = mockRes();

          await buildController().update(req, res, next);
          expect(res.status).toHaveBeenCalledWith(200);
      });

      it('update returns 400 for invalid id', async () => {
        const req = { params: { id: 'abc' } } as unknown as Request;
        const res = mockRes();
        await buildController().update(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid ID format" });
      });

      it('update returns 400 on validation error (invalid email)', async () => {
        const req = { params: { id: '1' }, body: { newEmail: "not-an-email" } } as unknown as Request;
        const res = mockRes();
        await buildController().update(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Invalid email") }));
      });

      it('update handles specific error messages (409)', async () => {
          const errs = [
              "InternalUser with this email already exists",
              "Role not found",
              "Role already assigned"
          ];
          for (const msg of errs) {
              mockInternalService.update.mockRejectedValueOnce(new Error(msg));
              // Valid empty body is allowed for update (all fields optional)
              const req = { params: { id: '1' }, body: {} } as unknown as Request;
              const res = mockRes();
              await buildController().update(req, res, next);
              expect(res.status).toHaveBeenCalledWith(409);
              expect(res.json).toHaveBeenCalledWith({ error: msg });
          }
      });

      it('update forwards other errors', async () => {
          mockInternalService.update.mockRejectedValue(new Error('Other'));
          const req = { params: { id: '1' }, body: {} } as unknown as Request;
          const res = mockRes();
          await buildController().update(req, res, next);
          expect(next).toHaveBeenCalled();
      });
  });

  // --- FETCH ---
  describe("fetch", () => {
      it('fetch returns 200 with users', async () => {
          mockInternalService.fetchUsers.mockResolvedValue([]);
          const res = mockRes();
          await buildController().fetch({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith([]);
      });

      it('fetch returns 400 on Error', async () => {
          mockInternalService.fetchUsers.mockRejectedValue(new Error("Fetch failed"));
          const res = mockRes();
          await buildController().fetch({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ error: "Fetch failed" });
      });

      it('fetch forwards non-Error throws', async () => {
          mockInternalService.fetchUsers.mockRejectedValue("string error");
          const res = mockRes();
          await buildController().fetch({} as Request, res, next);
          expect(next).toHaveBeenCalledWith("string error");
      });
  });

  // --- DELETE ---
  describe("delete", () => {
      it('delete returns 204 on success', async () => {
          mockInternalService.disableById.mockResolvedValue('ok');
          const req = { params: { id: '10' }, auth: { sub: 1 } } as any;
          const res = mockRes();
          await buildController().delete(req, res, next);
          expect(res.status).toHaveBeenCalledWith(204);
          expect(res.send).toHaveBeenCalled();
      });

      it('delete returns 400 for invalid id', async () => {
          const req = { params: { id: 'bad' } } as any;
          const res = mockRes();
          await buildController().delete(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ message: 'Invalid internal user id' });
      });

      it('delete returns 403 for self deletion', async () => {
          const req = { params: { id: '5' }, auth: { sub: 5 } } as any;
          const res = mockRes();
          await buildController().delete(req, res, next);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith({ message: 'You cannot delete your own account' });
      });

      it('delete returns 404 if user not found', async () => {
          mockInternalService.disableById.mockResolvedValue('not_found');
          const req = { params: { id: '10' }, auth: { sub: 1 } } as any;
          const res = mockRes();
          await buildController().delete(req, res, next);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({ message: 'Internal user not found' });
      });

      it('delete forwards unexpected errors', async () => {
          mockInternalService.disableById.mockRejectedValue(new Error('db error'));
          const req = { params: { id: '10' }, auth: { sub: 1 } } as any;
          const res = mockRes();
          await buildController().delete(req, res, next);
          expect(next).toHaveBeenCalledWith(expect.any(Error));
      });
  });

  // --- GET REPORTS ---
  describe("getReports", () => {
      it("returns 500 if reportService missing", async () => {
          const c = buildController(false); // no report service
          const res = mockRes();
          await c.getReports({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(500);
      });

      it("filters reports for PR Officer (defaults to Pending)", async () => {
          const req = { auth: { role: "Public Relations Officer" }, query: {} } as any;
          const res = mockRes();
          mockReportService.getReportsByStatus.mockResolvedValue([]);

          await buildController().getReports(req, res, next);

          expect(mockReportService.getReportsByStatus).toHaveBeenCalledWith(ReportStatus.PENDING_APPROVAL);
          expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns empty for PR Officer asking for non-pending", async () => {
        const req = { auth: { role: "Public Relations Officer" }, query: { status: "Resolved" } } as any;
        const res = mockRes();

        await buildController().getReports(req, res, next);

        expect(res.json).toHaveBeenCalledWith([]);
      });

      it("passes status for other roles", async () => {
        const req = { auth: { role: "Admin" }, query: { status: "Assigned" } } as any;
        const res = mockRes();
        mockReportService.getReportsByStatus.mockResolvedValue([]);

        await buildController().getReports(req, res, next);

        expect(mockReportService.getReportsByStatus).toHaveBeenCalledWith("Assigned");
      });

      it("handles errors", async () => {
        mockReportService.getReportsByStatus.mockRejectedValue(new Error("Fail"));
        const res = mockRes();
        await buildController().getReports({ query: {} } as any, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it("forwards non-Error throws", async () => {
        mockReportService.getReportsByStatus.mockRejectedValue("fail string");
        const res = mockRes();
        await buildController().getReports({ query: {} } as any, res, next);
        expect(next).toHaveBeenCalledWith("fail string");
      });
  });

  // --- UPDATE REPORT STATUS ---
  describe("updateReportStatus", () => {
      it("returns 500 if reportService missing", async () => {
          const c = buildController(false);
          const res = mockRes();
          await c.updateReportStatus({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(500);
      });

      it("returns 400 for invalid report ID", async () => {
          const req = { params: { id: "abc" } } as any;
          const res = mockRes();
          await buildController().updateReportStatus(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ error: "Invalid report ID" });
      });

      it("returns 400 on validation error (missing explanation)", async () => {
          // Explanation is required in UpdateReportRequestDTO
          const req = { params: { id: '1' }, body: { status: ReportStatus.RESOLVED } } as any;
          const res = mockRes();
          await buildController().updateReportStatus(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Explanation is required") }));
      });

      it("validates status enum", async () => {
          const req = { params: { id: '1' }, body: { status: "BadStatus", explanation: "Valid" } } as any;
          const res = mockRes();
          await buildController().updateReportStatus(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Invalid status") }));
      });

      it("calls service update", async () => {
        const req = { params: { id: '1' }, body: { status: ReportStatus.RESOLVED, explanation: "Done" }, auth: { role: "Admin", sub: 99 } } as any;
        const res = mockRes();
        mockReportService.updateReport.mockResolvedValue({});

        await buildController().updateReportStatus(req, res, next);

        expect(mockReportService.updateReport).toHaveBeenCalledWith(1, expect.anything(), 99, "Admin");
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns 403 for PR officer restriction error", async () => {
          mockReportService.updateReport.mockRejectedValue(new Error("PR officers can only update"));
          const req = { params: { id: '1' }, body: { status: ReportStatus.RESOLVED, explanation: "Done" } } as any;
          const res = mockRes();
          
          await buildController().updateReportStatus(req, res, next);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("PR officers can only update") });
      });

      it("returns 400 for other errors", async () => {
          mockReportService.updateReport.mockRejectedValue(new Error("Logic error"));
          const req = { params: { id: '1' }, body: { status: ReportStatus.RESOLVED, explanation: "Done" } } as any;
          const res = mockRes();
          await buildController().updateReportStatus(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({ error: "Logic error" });
      });

      it("forwards unexpected non-Error throws", async () => {
          mockReportService.updateReport.mockRejectedValue("weird error");
          const req = { params: { id: '1' }, body: { status: ReportStatus.RESOLVED, explanation: "Done" } } as any;
          const res = mockRes();
          await buildController().updateReportStatus(req, res, next);
          expect(next).toHaveBeenCalledWith("weird error");
      });
  });

  // --- GET REPORTS FOR TECH OFFICER ---
  describe("getReportsForTechnicalOfficer", () => {
      it("returns 500 if service missing", async () => {
          const c = buildController(false);
          const res = mockRes();
          await c.getReportsForTechnicalOfficer({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(500);
      });

      it("returns 401 if no sub", async () => {
          const req = { auth: {} } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(res.status).toHaveBeenCalledWith(401);
      });

      it("calls service with staff id", async () => {
          const req = { auth: { sub: 123 }, query: {} } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(mockReportService.getReportsForStaff).toHaveBeenCalledWith(123, undefined);
          expect(res.status).toHaveBeenCalledWith(200);
      });

      it("calls service with status filter when provided", async () => {
          const req = { auth: { sub: 123 }, query: { status: ReportStatus.DELEGATED } } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(mockReportService.getReportsForStaff).toHaveBeenCalledWith(123, ReportStatus.DELEGATED);
          expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns 400 for invalid status filter", async () => {
          const req = { auth: { sub: 123 }, query: { status: "InvalidStatus" } } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Invalid status filter") }));
      });

      it("returns 400 on error", async () => {
          mockReportService.getReportsForStaff.mockRejectedValue(new Error("Fail"));
          const req = { auth: { sub: 123 } } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
      });

      it("forwards non-error throws", async () => {
          mockReportService.getReportsForStaff.mockRejectedValue("fail");
          const req = { auth: { sub: 123 } } as any;
          const res = mockRes();
          await buildController().getReportsForTechnicalOfficer(req, res, next);
          expect(next).toHaveBeenCalledWith("fail");
      });
  });

  // --- GET REPORTS BY OFFICE ---
  describe("getReportsByOffice", () => {
      it("returns 500 if service missing", async () => {
          const c = buildController(false);
          const res = mockRes();
          await c.getReportsByOffice({} as Request, res, next);
          expect(res.status).toHaveBeenCalledWith(500);
      });

      it("returns 401 if no sub", async () => {
          const req = { auth: {} } as any;
          const res = mockRes();
          await buildController().getReportsByOffice(req, res, next);
          expect(res.status).toHaveBeenCalledWith(401);
      });

      it("rejects PR officers", async () => {
          const req = { auth: { sub: 1, role: "Public Relations Officer" } } as any;
          const res = mockRes();
          await buildController().getReportsByOffice(req, res, next);
          expect(res.status).toHaveBeenCalledWith(403);
      });

      it("calls service for others", async () => {
        const req = { auth: { sub: 1, role: "Admin" } } as any;
        const res = mockRes();
        await buildController().getReportsByOffice(req, res, next);
        expect(mockReportService.getReportsByOffice).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns 400 on error", async () => {
          mockReportService.getReportsByOffice.mockRejectedValue(new Error("Fail"));
          const req = { auth: { sub: 1 } } as any;
          const res = mockRes();
          await buildController().getReportsByOffice(req, res, next);
          expect(res.status).toHaveBeenCalledWith(400);
      });

      it("forwards non-error throws", async () => {
          mockReportService.getReportsByOffice.mockRejectedValue("fail");
          const req = { auth: { sub: 1 } } as any;
          const res = mockRes();
          await buildController().getReportsByOffice(req, res, next);
          expect(next).toHaveBeenCalledWith("fail");
      });
  });
});