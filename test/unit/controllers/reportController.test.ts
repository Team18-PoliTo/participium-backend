import ReportController from '../../../src/controllers/reportController';
import { Request, Response, NextFunction } from 'express';
import * as classValidator from 'class-validator';

const buildController = (serviceOverrides: Partial<{ create: jest.Mock }> = {}) => {
  const reportService = {
    create: jest.fn(),
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

  it('create handles validation objects without constraints', async () => {
    const validateSpy = jest.spyOn(classValidator, 'validate').mockResolvedValue([
      { constraints: undefined } as any,
    ]);
    const { controller, reportService } = buildController();
    const req = { body: {}, auth: { sub: 1, kind: 'citizen' } } as any;
    const res = mockRes();

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: '' });
    expect(reportService.create).not.toHaveBeenCalled();

    validateSpy.mockRestore();
  });

  it('create returns 404 when citizen is missing', async () => {
    const error = new Error('Citizen not found');
    const { controller, reportService } = buildController({
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
    expect(next).not.toHaveBeenCalled();
  });

  it('create returns 500 and forwards unexpected errors', async () => {
    const boom = new Error('boom');
    const { controller, reportService } = buildController({
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
    expect(next).toHaveBeenCalledWith(boom);
  });
});
