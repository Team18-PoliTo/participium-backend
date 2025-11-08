import 'express';
import type { AuthInfo } from './AuthInfo';

declare global {
    namespace Express {
        interface Request {
            auth?: AuthInfo;
        }
    }
}

export {};

