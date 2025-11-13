import RoleController from '../../../src/controllers/RoleController';
import { Request, Response, NextFunction } from 'express';

describe('RoleController', () => {
  const roleService = {
    getAllRoles: jest.fn(),
  } as any;
  const controller = new RoleController(roleService);

  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next: NextFunction = jest.fn();

  beforeEach(() => {
    next.mockReset();
    jest.clearAllMocks();
  });

  it('returns all roles', async () => {
    roleService.getAllRoles.mockResolvedValue([{ id: 1, role: 'ADMIN' }]);
    const res = mockRes();

    await controller.getAll({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, role: 'ADMIN' }]);
  });

  it('returns 400 when service fails with Error', async () => {
    roleService.getAllRoles.mockRejectedValue(new Error('boom'));
    const res = mockRes();

    await controller.getAll({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
  });

  it('forwards non-Error failures to next', async () => {
    roleService.getAllRoles.mockRejectedValue('fail');
    const res = mockRes();

    await controller.getAll({} as Request, res, next);

    expect(next).toHaveBeenCalledWith('fail');
  });
});
