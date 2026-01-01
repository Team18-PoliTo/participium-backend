import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  requireAdmin,
  requireInternalUser,
  requireCitizen,
  requireExternalMaintainer,
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
      auth: {
        kind: "internal",
        roles: ["ADMIN"],
      },
    } as unknown as Request;

    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
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

  it("requireAuth sets req.auth with all properties", () => {
    const verifySpy = jest.spyOn(jwt, "verify").mockReturnValue({
      sub: "123",
      kind: "citizen",
      role: "USER",
      email: "test@example.com",
    } as any);
    const req = {
      header: () => "Bearer token",
      auth: undefined,
    } as unknown as Request;
    const res = mockRes();

    requireAuth(req, res, next);

    expect(req.auth).toMatchObject({
      sub: 123,
      kind: "citizen",
      email: "test@example.com",
    });
    expect(next).toHaveBeenCalled();
    verifySpy.mockRestore();
  });

  it("requireAuth handles token without Bearer prefix", () => {
    const req = {
      header: () => "just-a-token",
    } as unknown as Request;
    const res = mockRes();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized (missing token)",
    });
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

  describe("requireInternalUser", () => {
    it("should return 401 when auth is missing", () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      requireInternalUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not internal", () => {
      const req = {
        auth: { kind: "citizen", sub: 1 },
      } as unknown as Request;
      const res = mockRes();

      requireInternalUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: not an internal user",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next when user is internal", () => {
      const req = {
        auth: { kind: "internal", sub: 1 },
      } as unknown as Request;
      const res = mockRes();

      requireInternalUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("requireCitizen", () => {
    it("should return 401 when auth is missing", () => {
      const req = {} as unknown as Request;
      const res = mockRes();

      requireCitizen(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not a citizen", () => {
      const req = {
        auth: { kind: "internal", sub: 1 },
      } as unknown as Request;
      const res = mockRes();

      requireCitizen(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: not a citizen",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next when user is a citizen", () => {
      const req = {
        auth: { kind: "citizen", sub: 1 },
      } as unknown as Request;
      const res = mockRes();

      requireCitizen(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("requireExternalMaintainer", () => {
    it("should allow external maintainer", async () => {
      const req = {
        auth: { kind: "internal", roles: ["External Maintainer"] },
      } as unknown as Request;
      const res = mockRes();

      await requireExternalMaintainer(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should fetch role from DB when missing for internal user", async () => {
      const req = {
        auth: { kind: "internal", sub: 5 },
      } as unknown as Request;

      const res = mockRes();

      mockFindById.mockResolvedValue({
        roles: [
          {
            role: {
              role: "External Maintainer",
            },
          },
        ],
      } as any);

      await requireExternalMaintainer(req, res, next);

      expect(mockFindById).toHaveBeenCalledWith(5);
      expect(next).toHaveBeenCalled();
      expect(req.auth?.roles).toEqual(["External Maintainer"]);
    });

    it("should reject non-external maintainer", async () => {
      const req = {
        auth: { kind: "internal", role: "ADMIN" },
      } as unknown as Request;
      const res = mockRes();

      await requireExternalMaintainer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: insufficient permissions",
      });
    });
  });
});
