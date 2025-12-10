import type { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireCitizen,
} from "../../src/middleware/authMiddleware";

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));
import jwt from "jsonwebtoken";

jest.mock("../../src/repositories/InternalUserRepository", () => {
  return {
    __esModule: true,
    default: class InternalUserRepository {
      findById = jest.fn();
    },
  };
});

function makeRes() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

const next: NextFunction = jest.fn();

describe("requireAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("→ returns 401 if no token is provided", () => {
    const req = { header: () => "" } as unknown as Request;
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (missing token)",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("→ returns 401 if payload is invalid (string)", () => {
    (jwt.verify as jest.Mock).mockReturnValue("str"); // not an object
    const req = { header: () => "Bearer abc" } as unknown as Request;
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    // middleware catches this as a generic invalid token
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (invalid token)",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("→ returns 401 if jwt.verify throws error", () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("bad");
    });
    const req = { header: () => "Bearer bad" } as unknown as Request;
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (invalid token)",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  beforeEach(() => jest.clearAllMocks());

  it("→ returns 401 if req.auth is missing", async () => {
    const mw = requireRole(["ADMIN"]);
    const req = {} as Request;
    const res = makeRes();

    await mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("→ returns 403 if role is not allowed", async () => {
    const mw = requireRole(["ADMIN"]);
    const req = {
      auth: { role: "VIEWER", kind: "internal", sub: 1 },
    } as any as Request;
    const res = makeRes();

    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("→ requireAdmin allows only ADMIN role", async () => {
    const reqOk = {
      auth: { role: "ADMIN", kind: "internal", sub: 1 },
    } as any as Request;
    const reqNo = {
      auth: { role: "VIEWER", kind: "internal", sub: 1 },
    } as any as Request;
    const res = makeRes();

    await requireAdmin(reqOk, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    await requireAdmin(reqNo, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("requireCitizen", () => {
  it("→ returns 401 if auth is missing", () => {
    const req = {} as Request;
    const res = makeRes();
    requireCitizen(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('→ returns 403 if kind is not "citizen"', () => {
    const req = { auth: { kind: "internal" } } as any as Request;
    const res = makeRes();
    requireCitizen(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("→ calls next if user is citizen", () => {
    const req = { auth: { kind: "citizen" } } as any as Request;
    const res = makeRes();
    requireCitizen(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
