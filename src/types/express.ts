import "express";
import type { AuthInfo } from "./AuthInfo";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthInfo;
    }
  }
}

export type __express_request_auth_patch = unknown;
