// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import InternalUserRepository from '../repositories/InternalUserRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const internalUserRepo = new InternalUserRepository();

type AuthTokenPayload = jwt.JwtPayload & {
    sub: number;
    kind: 'internal' | 'public';
    role?: string;
    email?: string;
};

function isAuthTokenPayload(x: unknown): x is AuthTokenPayload {
    return !!x && typeof x === 'object'
        && 'sub' in x
        && 'kind' in x
        && (x as any).kind !== undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const h = req.header('Authorization') || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : '';
        if (!token) return res.status(401).json({ message: 'Unauthorized (missing token)' });

        const decoded = jwt.verify(token, JWT_SECRET); // string | JwtPayload
        if (typeof decoded === 'string' || !isAuthTokenPayload(decoded)) {
            return res.status(401).json({ message: 'Unauthorized (invalid token payload)' });
        }

        req.auth = {
            sub: decoded.sub,
            kind: decoded.kind,
            role: decoded.role,
            email: decoded.email,
        };

        return next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized (invalid token)' });
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.auth) return res.status(401).json({ message: 'Unauthorized' });
        if (req.auth.kind !== 'internal') {
            return res.status(403).json({ message: 'Admins only (internal user required)' });
        }

        if (req.auth.role?.toUpperCase() === 'ADMIN') return next();

        const internalUser = await internalUserRepo.findById(req.auth.sub);
        const roleName = (internalUser as any)?.role?.name;
        if (String(roleName || '').toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ message: 'Admins only' });
        }

        req.auth.role = roleName;
        return next();
    } catch {
        return res.status(500).json({ message: 'Cannot verify admin role' });
    }
}