import ReportController from '../../../src/controllers/reportController';
import { Response, NextFunction } from 'express';

// Helper to build controller with specific service mocks
const buildController = (serviceOverrides: Record<string, jest.Mock> = {}) => {
  const reportService = {
    create: jest.fn(),
    getReportsByUser: jest.fn(),
    getReportById: jest.fn(),
    getAssignedReportsInMap: jest.fn(),
    ...serviceOverrides,
  };
  return { controller: new ReportController(reportService as any), reportService };
};

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let next: NextFunction;

describe('ReportController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  // --- create ---
  it('create returns 201 on success', async () => {
    const { controller, reportService } = buildController();
    const req = {
      body: {
        title: 'Issue',
        description: 'Desc',
        categoryId: 1,
        photoIds: ['file1', 'file2'],
        location: { latitude: 1, longitude: 2 },
      },
      auth: { sub: 1, kind: 'citizen' },
    } as any;
    const res = mockRes();
    const dto = { id: 5 };
    reportService.create.mockResolvedValue(dto);

    await controller.create(req, res, next);

    expect(reportService.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(dto);
  });

  it('create returns 400 on validation errors', async () => {
    const { controller, reportService } = buildController();
    const req = { body: {}, auth: { sub: 1, kind: 'citizen' } } as any;
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Title is required'),
    });
    expect(reportService.create).not.toHaveBeenCalled();
  });

  it('create returns 404 when citizen is missing', async () => {
    const error = new Error('Citizen not found');
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(error),
    });
    const req = {
      body: {
        title: 'Issue',
        description: 'Desc',
        categoryId: 1,
        photoIds: ['file1'],
        location: { latitude: 1, longitude: 2 },
      },
      auth: { sub: 1, kind: 'citizen' },
    } as any;
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Citizen not found' });
  });

  it('create returns 400 when category is not found', async () => {
    const error = new Error('Category not found');
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(error),
    });
    const req = {
      body: {
        title: 'Issue',
        description: 'Desc',
        categoryId: 999,
        photoIds: ['file1'],
        location: { latitude: 1, longitude: 2 },
      },
      auth: { sub: 1, kind: 'citizen' },
    } as any;
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
  });

  it('create returns 500 and forwards unexpected errors', async () => {
    const boom = new Error('boom');
    const { controller } = buildController({
      create: jest.fn().mockRejectedValue(boom),
    });
    const req = {
      body: {
        title: 'Issue',
        description: 'Desc',
        categoryId: 1,
        photoIds: ['file1'],
        location: { latitude: 1, longitude: 2 },
      },
      auth: { sub: 1, kind: 'citizen' },
    } as any;
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  // --- getMyReports ---
  it('getMyReports returns 200 with reports', async () => {
    const { controller, reportService } = buildController();
    const req = { auth: { sub: 42 } } as any;
    const res = mockRes();
    const reports = [{ id: 1 }];
    reportService.getReportsByUser.mockResolvedValue(reports);

    await controller.getMyReports(req, res, next);

    expect(reportService.getReportsByUser).toHaveBeenCalledWith(42);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  it('getMyReports returns 401 if sub missing', async () => {
    const { controller } = buildController();
    const req = { auth: {} } as any;
    const res = mockRes();

    await controller.getMyReports(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it('getMyReports handles errors', async () => {
    const error = new Error("Fail");
    const { controller } = buildController({
        getReportsByUser: jest.fn().mockRejectedValue(error)
    });
    const req = { auth: { sub: 42 } } as any;
    const res = mockRes();

    await controller.getMyReports(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    // expect(next).toHaveBeenCalledWith(error); // Removed: controller handles error internally via handleError
  });

  // --- getById ---
  it('getById returns 200 with report', async () => {
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

  it('getById returns 400 for invalid ID', async () => {
    const { controller } = buildController();
    const req = { params: { id: "abc" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid report ID" });
  });

  it('getById returns 404 if report not found', async () => {
    const error = new Error("Report not found");
    const { controller } = buildController({
        getReportById: jest.fn().mockRejectedValue(error)
    });
    const req = { params: { id: "99" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
  });

  it('getById forwards unexpected errors', async () => {
    const error = new Error("DB Error");
    const { controller } = buildController({
        getReportById: jest.fn().mockRejectedValue(error)
    });
    const req = { params: { id: "10" } } as any;
    const res = mockRes();

    await controller.getById(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  // --- getAssignedReportsInMap ---
  it('getAssignedReportsInMap returns 200 with reports', async () => {
    const { controller, reportService } = buildController();
    const corners = [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }];
    const req = { body: { corners } } as any;
    const res = mockRes();
    const reports = [{ id: 1 }];
    reportService.getAssignedReportsInMap.mockResolvedValue(reports);

    await controller.getAssignedReportsInMap(req, res, next);

    expect(reportService.getAssignedReportsInMap).toHaveBeenCalledWith(corners);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  it('getAssignedReportsInMap returns 400 on validation error', async () => {
    const { controller } = buildController();
    const req = { body: { corners: "invalid" } } as any;
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.anything() }));
  });

  it('getAssignedReportsInMap returns 400 if wrong number of corners', async () => {
    const { controller } = buildController();
    const req = { body: { corners: [{ latitude: 1, longitude: 1 }] } } as any;
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Exactly 2 corners are required" });
  });

  it('getAssignedReportsInMap returns 400 if service throws Error', async () => {
    const error = new Error("Logic error");
    const { controller } = buildController({
        getAssignedReportsInMap: jest.fn().mockRejectedValue(error)
    });
    const req = { body: { corners: [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }] } } as any;
    const res = mockRes();

    await controller.getAssignedReportsInMap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Logic error" });
    expect(next).toHaveBeenCalledWith(error);
  });
});