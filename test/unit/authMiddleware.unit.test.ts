import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireAdmin, requireCitizen }
    from "../../src/middleware/authMiddleware";

// Мокаем jsonwebtoken и репозиторий
jest.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        verify: jest.fn(),
    },
}));
import jwt from 'jsonwebtoken';

jest.mock('../../../src/repositories/InternalUserRepository', () => {
    return {
        __esModule: true,
        default: class InternalUserRepository {
            findById = jest.fn();
        },
    };
});
import InternalUserRepository from '../../src/repositories/InternalUserRepository';

function makeRes() {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res as Response;
}

const next: NextFunction = jest.fn();

describe('requireAuth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('→ 401 если нет токена', () => {
        const req = { header: () => '' } as unknown as Request;
        const res = makeRes();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized (missing token)' });
        expect(next).not.toHaveBeenCalled();
    });

    it('→ 401 если payload невалиден', () => {
        (jwt.verify as jest.Mock).mockReturnValue('str'); // не объект
        const req = { header: () => 'Bearer abc' } as unknown as Request;
        const res = makeRes();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized (invalid token payload)' });
        expect(next).not.toHaveBeenCalled();
    });

    it('→ кладёт auth в req и вызывает next при валидном токене', () => {
        (jwt.verify as jest.Mock).mockReturnValue({
            sub: 42,
            kind: 'internal',
            role: 'ADMIN',
            email: 'a@b.com',
        });

        const req = { header: () => 'Bearer good' } as unknown as Request & { auth?: any };
        const res = makeRes();

        requireAuth(req as Request, res, next);

        expect((req as any).auth).toEqual({
            sub: 42,
            kind: 'internal',
            role: 'ADMIN',
            email: 'a@b.com',
        });
        expect(next).toHaveBeenCalled();
    });

    it('→ 401 если verify кидает ошибку', () => {
        (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('bad'); });
        const req = { header: () => 'Bearer bad' } as unknown as Request;
        const res = makeRes();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('requireRole', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('→ 401 если req.auth нет', async () => {
        const mw = requireRole(['ADMIN']);
        const req = {} as Request;
        const res = makeRes();
        await mw(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('→ 403 если роль не разрешена', async () => {
        const mw = requireRole(['ADMIN']);
        const req = { auth: { role: 'VIEWER', kind: 'internal', sub: 1 } } as any as Request;
        const res = makeRes();
        await mw(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('→ подтягивает роль из БД если её нет в токене (internal)', async () => {
        const mw = requireRole(['OPERATOR']);
        const repo = new (InternalUserRepository as any)();
        repo.findById.mockResolvedValue({ role: { name: 'OPERATOR' } });

        const req = { auth: { role: undefined, kind: 'internal', sub: 7 } } as any as Request;
        const res = makeRes();
        await mw(req, res, next);

        expect(repo.findById).toHaveBeenCalledWith(7);
        expect(req.auth.role).toBe('OPERATOR');
        expect(next).toHaveBeenCalled();
    });

    it('→ requireAdmin пускает только ADMIN', async () => {
        const reqOk = { auth: { role: 'ADMIN', kind: 'internal', sub: 1 } } as any as Request;
        const reqNo = { auth: { role: 'VIEWER', kind: 'internal', sub: 1 } } as any as Request;
        const res = makeRes();

        await requireAdmin(reqOk, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        jest.clearAllMocks();
        await requireAdmin(reqNo, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe('requireCitizen', () => {
    it('→ 401 без auth', () => {
        const req = {} as Request;
        const res = makeRes();
        requireCitizen(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('→ 403 если kind не citizen', () => {
        const req = { auth: { kind: 'internal' } } as any as Request;
        const res = makeRes();
        requireCitizen(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('→ next для citizen', () => {
        const req = { auth: { kind: 'citizen' } } as any as Request;
        const res = makeRes();
        requireCitizen(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});