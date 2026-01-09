import ReportController from "../../../src/controllers/reportController";
import { Response, NextFunction } from "express";

const buildController = (serviceOverrides: Record<string, jest.Mock> = {}) => {
  const reportService = {
    create: jest.fn(),
    getReportsByUser: jest.fn(),
    getReportById: jest.fn(),
    getAssignedReportsInMap: jest.fn(),
    ...serviceOverrides,
  };
  return {
    controller: new ReportController(reportService as any),
    reportService,
  };
};

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockCreateReq = (overrides: Partial<any> = {}) =>
  ({
    body: {
      title: "Issue",
      description: "Desc",
      categoryId: 1,
      photoIds: ["file1"],
      location: { latitude: 1, longitude: 2 },
      ...(overrides.body ?? {}),
    },
    auth: { sub: 1, kind: "citizen", ...(overrides.auth ?? {}) },
  }) as any;

const mockGetAssignedReq = (overrides: Partial<any> = {}) =>
  ({
    body: {
      corners: [
        { latitude: 1, longitude: 1 },
        { latitude: 2, longitude: 2 },
      ],
      ...(overrides.body ?? {}),
    },
  }) as any;

let next: NextFunction;

describe("ReportController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it("create returns 201 on success", async () => {
    const { controller, reportService } = buildController();
    const req = mockCreateReq();
    const res = mockRes();
    const dto = { id: 5 };

    reportService.create.mockResolvedValue(dto);

    await controller.create(req, res, next);

    expect(reportService.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(dto);
  });

  it("create returns 404 when citizen is missing", async () => {
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(new Error("Citizen not found")),
    });

    const req = mockCreateReq();
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Citizen not found" });
  });

  it("create returns 400 when category is not found", async () => {
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(new Error("Category not found")),
    });

    const req = mockCreateReq({ body: { categoryId: 999 } });
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Category not found" });
  });

  it("create handles non-Error exceptions", async () => {
    const { controller, reportService } = buildController();
    const req = mockCreateReq();
    const res = mockRes();

    reportService.create.mockRejectedValue({ code: "X", message: "Oops" });

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });

  it("create returns 500 on unexpected error", async () => {
    const boom = new Error("boom");
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(boom),
    });

    const req = mockCreateReq();
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });

  it("create handles HttpException with string message", async () => {
    const { HttpException } = require("@nestjs/common");
    const error = new HttpException("String error", 400);

    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(error),
    });

    const req = mockCreateReq();
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "String error" });
  });

  it("create handles HttpException with object message", async () => {
    const { HttpException } = require("@nestjs/common");
    const error = new HttpException({ message: "Object error" }, 400);

    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(error),
    });

    const req = mockCreateReq();
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Object error" });
  });

  it("getMyReports returns 200 with reports", async () => {
    const { controller, reportService } = buildController();
    const req = { auth: { sub: 42 } } as any;
    const res = mockRes();

    const reports = [{ id: 1 }];
    reportService.getReportsByUser.mockResolvedValue(reports);

    await controller.getMyReports(req, res, next);

    expect(reportService.getReportsByUser).toHaveBeenCalledWith(42, "CITIZEN");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  it("getMyReports returns 401 if sub missing", async () => {
    const { controller } = buildController();
    const req = { auth: {} } as any;
    const res = mockRes();

    await controller.getMyReports(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("getMyReports handles error", async () => {
    const { controller } = buildController({
      getReportsByUser: jest.fn().mockRejectedValue(new Error("Fail")),
    });

    const req = { auth: { sub: 42 } } as any;
    const res = mockRes();

    await controller.getMyReports(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("getById returns 200 with report", async () => {
    const { controller, reportService } = buildController();
    const req = { params: { id: "10" } } as any;
    const res = mockRes();
    const report = { id: 10 };

    reportService.getReportById.mockResolvedValue(report);

    await controller.getById(req, res, next);

    expect(reportService.getReportById).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(report);
  });

  it("getById returns 400 for invalid ID", async () => {
    const { controller } = buildController();
    const req = { params: { id: "abc" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid report ID" });
  });

  it("getById returns 404 if not found", async () => {
    const { controller } = buildController({
      getReportById: jest.fn().mockRejectedValue(new Error("Report not found")),
    });

    const req = { params: { id: "99" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
  });

  it("getById forwards unexpected errors", async () => {
    const boom = new Error("DB Error");
    const { controller } = buildController({
      getReportById: jest.fn().mockRejectedValue(boom),
    });

    const req = { params: { id: "10" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it("getAssignedReportsInMap returns 200 with reports", async () => {
    const { controller, reportService } = buildController();
    const req = mockGetAssignedReq();
    const res = mockRes();
    const reports = [{ id: 1 }];

    reportService.getAssignedReportsInMap.mockResolvedValue(reports);

    await controller.getAssignedReportsInMap(req, res, next);

    expect(reportService.getAssignedReportsInMap).toHaveBeenCalledWith(
      req.body.corners
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  it("getAssignedReportsInMap returns 400 on invalid body", async () => {
    const { controller } = buildController();
    const req = mockGetAssignedReq({ body: { corners: "invalid" } });
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.anything() })
    );
  });

  it("getAssignedReportsInMap returns 400 if wrong number of corners", async () => {
    const { controller } = buildController();
    const req = mockGetAssignedReq({
      body: { corners: [{ latitude: 1, longitude: 1 }] },
    });
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Exactly 2 corners are required",
    });
  });

  it("getAssignedReportsInMap returns 400 if service throws Error", async () => {
    const { controller } = buildController({
      getAssignedReportsInMap: jest
        .fn()
        .mockRejectedValue(new Error("Logic error")),
    });

    const req = mockGetAssignedReq();
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Logic error" });
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("getAssignedReportsInMap forwards non-Error exceptions", async () => {
    const nonError = { code: "UNKNOWN" };

    const { controller } = buildController({
      getAssignedReportsInMap: jest.fn().mockRejectedValue(nonError),
    });

    const req = mockGetAssignedReq();
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(next).toHaveBeenCalledWith(nonError);
    expect(res.status).not.toHaveBeenCalled();
  });
});
