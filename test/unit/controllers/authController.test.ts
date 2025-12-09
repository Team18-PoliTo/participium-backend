import AuthController from '../../../src/controllers/authController';
import { Request, Response, NextFunction } from 'express';
import * as classValidator from 'class-validator';

jest.mock('../../../src/repositories/implementation/CitizenRepository', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn(),
  })),
}));

jest.mock('../../../src/repositories/InternalUserRepository', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
  })),
}));

describe('AuthController', () => {
  const citizenService = {
    login: jest.fn(),
  } as any;
  const internalService = {
    login: jest.fn(),
  } as any;
  const citizenRepository = {
    findByEmail: jest.fn(),
  } as any;
  const internalRepository = {
    findById: jest.fn(),
  } as any;

  const CitizenRepositoryMock = jest.requireMock('../../../src/repositories/implementation/CitizenRepository').default as jest.Mock;
  const InternalRepositoryMock = jest.requireMock('../../../src/repositories/InternalUserRepository').default as jest.Mock;

  const buildController = () =>
    new AuthController(
      citizenService,
      internalService,
      citizenRepository,
      internalRepository
    );

  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next: NextFunction = jest.fn();

  beforeEach(() => {
    next.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    CitizenRepositoryMock.mockClear();
    InternalRepositoryMock.mockClear();
  });

  it('loginCitizen returns access token', async () => {
    const controller = buildController();
    citizenService.login.mockResolvedValue({ access_token: 'abc', token_type: 'bearer' });
    const req = { body: { email: 'john@doe.com', password: 'secret' } } as Request;
    const res = mockRes();

    await controller.loginCitizen(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ access_token: 'abc', token_type: 'bearer' });
  });

  it('loginCitizen maps username to email and handles invalid credentials', async () => {
    const controller = buildController();
    citizenService.login.mockRejectedValue(new Error('Invalid credentials'));
    const req = { body: { username: 'user@city.com', password: 'badPwd', grant_type: 'password' } } as Request;
    const res = mockRes();

    await controller.loginCitizen(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('loginCitizen returns 400 on validation failure', async () => {
    const controller = buildController();
    const req = { body: { email: 'not-an-email', password: 'short' } } as Request;
    const res = mockRes();

    await controller.loginCitizen(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(citizenService.login).not.toHaveBeenCalled();
  });

  it('loginCitizen handles validation errors without constraints', async () => {
    const controller = buildController();
    const validateSpy = jest.spyOn(classValidator, 'validate').mockResolvedValue([
      { constraints: undefined } as any,
    ]);
    const req = { body: { email: 'bad', password: 'short' } } as Request;
    const res = mockRes();

    await controller.loginCitizen(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(citizenService.login).not.toHaveBeenCalled();

    validateSpy.mockRestore();
  });

  it('loginCitizen forwards unexpected errors', async () => {
    const controller = buildController();
    citizenService.login.mockRejectedValue(new Error('database down'));
    const req = { body: { email: 'john@doe.com', password: 'secret' } } as Request;
    const res = mockRes();

    await controller.loginCitizen(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('loginInternal returns access token', async () => {
    const controller = buildController();
    internalService.login.mockResolvedValue({ access_token: 'xyz', token_type: 'bearer' });
    const req = { body: { username: 'staff@city.com', password: 'securepwd' } } as Request;
    const res = mockRes();

    await controller.loginInternal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ access_token: 'xyz', token_type: 'bearer' });
  });

  it('loginInternal returns 400 on validation failure', async () => {
    const controller = buildController();
    const req = { body: { email: 'staff@city.com', password: '123' } } as Request;
    const res = mockRes();

    await controller.loginInternal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(internalService.login).not.toHaveBeenCalled();
  });

  it('loginInternal handles validation errors without constraints', async () => {
    const controller = buildController();
    const validateSpy = jest.spyOn(classValidator, 'validate').mockResolvedValue([
      { constraints: undefined } as any,
    ]);
    const req = { body: { email: 'staff@city.com', password: 'short' } } as Request;
    const res = mockRes();

    await controller.loginInternal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(internalService.login).not.toHaveBeenCalled();

    validateSpy.mockRestore();
  });

  it('loginInternal handles invalid credentials', async () => {
    const controller = buildController();
    internalService.login.mockRejectedValue(new Error('Invalid credentials'));
    const req = { body: { email: 'staff@city.com', password: 'wrongpwd' } } as Request;
    const res = mockRes();

    await controller.loginInternal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('loginInternal forwards unexpected errors', async () => {
    const controller = buildController();
    internalService.login.mockRejectedValue(new Error('boom'));
    const req = { body: { email: 'staff@city.com', password: 'securepwd' } } as Request;
    const res = mockRes();

    await controller.loginInternal(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('logout returns success message', async () => {
    const controller = buildController();
    const res = mockRes();

    await controller.logout({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });

  it('me returns citizen profile', async () => {
    const controller = buildController();
    const req = {
      auth: { kind: 'citizen', email: 'citizen@city.com' },
    } as unknown as Request;
    const res = mockRes();
    citizenRepository.findByEmail.mockResolvedValue({
      id: 10,
      email: 'citizen@city.com',
      username: 'citizen',
      firstName: 'City',
      lastName: 'Zen',
      createdAt: new Date(),
      status: 'ACTIVE',
    });

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'citizen' })
    );
  });

  it('me returns internal profile', async () => {
    const controller = buildController();
    const req = {
      auth: { kind: 'internal', sub: 4 },
    } as unknown as Request;
    const res = mockRes();
    internalRepository.findById.mockResolvedValue({
      id: 4,
      email: 'staff@city.com',
      firstName: 'Staff',
      lastName: 'Member',
      role: { role: 'ADMIN' },
      createdAt: new Date(),
      status: 'ACTIVE',
    });

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'internal' })
    );
  });

  it('me returns 401 when auth missing', async () => {
    const controller = buildController();
    const req = {} as Request;
    const res = mockRes();

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('me returns 404 when citizen record missing', async () => {
    const controller = buildController();
    const req = { auth: { kind: 'citizen', email: 'missing@city.com' } } as unknown as Request;
    const res = mockRes();
    citizenRepository.findByEmail.mockResolvedValue(null);

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Citizen not found' });
  });

  it('me returns 404 when internal record missing', async () => {
    const controller = buildController();
    const req = { auth: { kind: 'internal', sub: 9 } } as unknown as Request;
    const res = mockRes();
    internalRepository.findById.mockResolvedValue(null);

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal user not found' });
  });

  it('me uses default repositories when not provided', async () => {
    CitizenRepositoryMock.mockImplementation(() => ({
      findByEmail: jest.fn().mockResolvedValue({
        id: 1,
        email: 'default@city.com',
        username: 'd',
        firstName: 'D',
        lastName: 'Ef',
        status: 'ACTIVE',
        createdAt: new Date(),
      }),
    }));
    InternalRepositoryMock.mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue({
        id: 2,
        email: 'internal@city.com',
        firstName: 'In',
        lastName: 'Side',
        role: { role: 'ADMIN' },
        createdAt: new Date(),
        status: 'ACTIVE',
      }),
    }));

    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        try {
          const { default: IsolatedAuthController } = require('../../../src/controllers/authController');
          const controller = new IsolatedAuthController(citizenService, internalService);
          const req = { auth: { kind: 'citizen', email: 'default@city.com' } } as unknown as Request;
          const res = mockRes();

          controller
            .me(req, res, next)
            .then(() => {
              try {
                expect(CitizenRepositoryMock).toHaveBeenCalled();
                const citizenRepoInstance = CitizenRepositoryMock.mock.results[CitizenRepositoryMock.mock.results.length - 1].value;
                expect(citizenRepoInstance.findByEmail).toHaveBeenCalledWith('default@city.com');
                expect(res.status).toHaveBeenCalledWith(200);
                resolve();
              } catch (error_) {
                reject(error_);
              }
            })
            .catch(reject);
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it('me falls back to empty email when citizen email missing', async () => {
    const controller = buildController();
    const req = { auth: { kind: 'citizen' } } as unknown as Request;
    const res = mockRes();
    citizenRepository.findByEmail.mockResolvedValue({
      id: 3,
      email: '',
      username: 'fallback',
      firstName: 'Fallback',
      lastName: 'User',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    await controller.me(req, res, next);

    expect(citizenRepository.findByEmail).toHaveBeenCalledWith('');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('me returns 400 for unknown auth kind', async () => {
    const controller = buildController();
    const req = { auth: { kind: 'service' } } as unknown as Request;
    const res = mockRes();

    await controller.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unknown authentication kind' });
  });

  it('me forwards repository errors to next', async () => {
    const controller = buildController();
    const req = { auth: { kind: 'citizen', email: 'err@city.com' } } as unknown as Request;
    const res = mockRes();
    const boom = new Error('lookup failed');
    citizenRepository.findByEmail.mockRejectedValue(boom);

    await controller.me(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
