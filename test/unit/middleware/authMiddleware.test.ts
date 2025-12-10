import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  requireAdmin,
} from "../../../src/middleware/authMiddleware";
import InternalUserRepository from "../../../src/repositories/InternalUserRepository";

const mockFindById = jest.spyOn(InternalUserRepository.prototype, "findById");

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let next: NextFunction;

describe("authMiddleware", () => {
  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFindById.mockReset();
  });

  it("requireAuth rejects missing token", () => {
    const req = { header: () => "" } as unknown as Request;
    const res = mockRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (missing token)",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("requireAuth rejects invalid token", () => {
    const req = {
      header: () => "Bearer invalid.token.value",
    } as unknown as Request;
    const res = mockRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (invalid token)",
    });
  });

  it("requireAuth rejects when jwt payload is string", () => {
    const verifySpy = jest.spyOn(jwt, "verify").mockReturnValue("payload");
    const req = {
      header: () => "Bearer whatever",
    } as unknown as Request;
    const res = mockRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (invalid token payload)",
    });
    verifySpy.mockRestore();
  });

  it("requireAdmin rejects when auth missing", async () => {
    const res = mockRes();

    await requireAdmin({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("requireAdmin allows internal admin", async () => {
    const req = {
      auth: { kind: "internal", role: "ADMIN" },
    } as unknown as Request;
    const res = mockRes();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("requireAdmin fetches role when missing", async () => {
    const req = {
      auth: { kind: "internal", sub: 5 },
    } as unknown as Request;
    const res = mockRes();
    mockFindById.mockResolvedValue({ role: { name: "ADMIN" } } as any);

    await requireAdmin(req, res, next);

    expect(mockFindById).toHaveBeenCalledWith(5);
    expect(next).toHaveBeenCalled();
    expect(req.auth?.role).toBe("ADMIN");
  });

  it("requireAdmin rejects when role still missing", async () => {
    const req = {
      auth: { kind: "internal", sub: 8 },
    } as unknown as Request;
    const res = mockRes();
    mockFindById.mockResolvedValue(null);

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: insufficient permissions",
    });
  });

  it("requireAdmin handles repository errors with 500", async () => {
    const req = {
      auth: { kind: "internal", sub: 99 },
    } as unknown as Request;
    const res = mockRes();
    mockFindById.mockRejectedValue(new Error("db down"));

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Cannot verify role" });
  });

  it("requireAdmin rejects non-admin", async () => {
    const req = {
      auth: { kind: "internal", role: "PRO" },
    } as unknown as Request;
    const res = mockRes();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: insufficient permissions",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
