import 'express';

export type AuthInfo = {
    sub: number;
    kind: 'internal' | 'public';
    role?: string;
    email?: string;
};

declare global {
    namespace Express {
        interface Request {
            auth?: AuthInfo;
        }
    }
}

export {};

