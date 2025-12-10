// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import InternalUserRepository from "../repositories/InternalUserRepository";
import type { AuthInfo } from "../types/AuthInfo";
import "../types/express"; // ensures Express.Request has `auth`

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const internalUserRepo = new InternalUserRepository();

type AuthTokenPayload = jwt.JwtPayload & AuthInfo;

function isAuthTokenPayload(x: unknown): x is AuthTokenPayload {
  return !!x && typeof x === "object" && "sub" in x && "kind" in x;
}

/**
 * requireAuth:
 * - Validates the Bearer token
 * - Extracts auth info from JWT
 * - Stores it in `req.auth` for easy access by later middleware & handlers
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const header = req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      res.status(401).json({ message: "Unauthorized (missing token)" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string" || !isAuthTokenPayload(decoded)) {
      res.status(401).json({ message: "Unauthorized (invalid token payload)" });
      return;
    }

    // Store the authenticated user info in the request object
    req.auth = {
      sub: Number(decoded.sub),
      kind: decoded.kind,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(401).json({ message: "Unauthorized (invalid token)" });
  }
};


/**
 * requireRole:
 * - Checks if the user has one of the allowed roles.
 * - If the user's role is not present in the token but the user is `internal`,
 *   we fetch the role from the database and cache it back into `req.auth.role`.
 */
export const requireRole = (allowedRoles: string[]) => {
  const allowed = new Set(allowedRoles.map((r) => r.toUpperCase()));

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.auth) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      let role = req.auth.role;

      // If role is missing but it's an internal user, fetch from DB and cache it
      if (!role && req.auth.kind === "internal") {
        const internalUser = await internalUserRepo.findById(req.auth.sub);
        role = (internalUser as any)?.role?.name as string | undefined;
        if (role) req.auth.role = role;
      }

      if (!role || !allowed.has(String(role).toUpperCase())) {
        res
          .status(403)
          .json({ message: "Forbidden: insufficient permissions" });
        return;
      }

      next();
    } catch {
      res.status(500).json({ message: "Cannot verify role" });
    }
  };
};

export const requireAdmin = requireRole(["ADMIN"]);

export const requireExternalMaintainer = requireRole(["External Maintainer"]);

export const requireInternalUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.auth.kind !== "internal") {
    res.status(403).json({ message: "Forbidden: not an internal user" });
    return;
  }

  next();
};

export const requireCitizen = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.auth.kind !== "citizen") {
    res.status(403).json({ message: "Forbidden: not a citizen" });
    return;
  }

  next();
};
