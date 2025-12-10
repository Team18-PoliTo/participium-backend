import CitizenController from "../../../src/controllers/citizenController";
import { Request, Response, NextFunction } from "express";
import * as classValidator from "class-validator";

describe("CitizenController", () => {
  const citizenService = {
    register: jest.fn(),
    getCitizenById: jest.fn(),
    updateCitizen: jest.fn(),
  } as any;
  const controller = new CitizenController(citizenService);

  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("register creates citizen and returns 201", async () => {
    citizenService.register.mockResolvedValue({ id: 1 });
    const req = {
      body: {
        email: "citizen@city.com",
        username: "citizen",
        firstName: "City",
        lastName: "Zen",
        password: "strongpwd",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("register returns 400 when validation fails", async () => {
    const req = {
      body: {
        email: "bad-email",
        username: "citizen",
        firstName: "City",
        lastName: "Zen",
        password: "123",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(citizenService.register).not.toHaveBeenCalled();
  });

  it("register returns 409 when email exists", async () => {
    citizenService.register.mockRejectedValue(
      new Error("Citizen with this email already exists")
    );
    const req = {
      body: {
        email: "dup@city.com",
        username: "citizen",
        firstName: "City",
        lastName: "Zen",
        password: "strongpwd",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Citizen with this email already exists",
    });
  });

  it("register returns 409 when username exists", async () => {
    citizenService.register.mockRejectedValue(
      new Error("Citizen with this username already exists")
    );
    const req = {
      body: {
        email: "fresh@city.com",
        username: "taken",
        firstName: "City",
        lastName: "Zen",
        password: "strongpwd",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Citizen with this username already exists",
    });
  });

  it("register gracefully handles validation results without constraints", async () => {
    const validateSpy = jest
      .spyOn(classValidator, "validate")
      .mockResolvedValue([{ constraints: undefined } as any]);
    const req = {
      body: {
        email: "missing@city.com",
        username: "citizen",
        firstName: "City",
        lastName: "Zen",
        password: "weak",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "" });
    expect(citizenService.register).not.toHaveBeenCalled();

    validateSpy.mockRestore();
  });

  it("register forwards unexpected errors", async () => {
    const boom = new Error("boom");
    citizenService.register.mockRejectedValue(boom);
    const req = {
      body: {
        email: "new@city.com",
        username: "new-user",
        firstName: "City",
        lastName: "Zen",
        password: "strongpwd",
      },
    } as Request;
    const res = mockRes();

    await controller.register(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  describe("getMe", () => {
    const makeReq = (auth: any): any => ({ auth });
    const res = mockRes();

    const mockCitizen = {
      id: 1,
      email: "citizen@city.com",
      username: "citizen",
      firstName: "City",
      lastName: "Zen",
      status: "ACTIVE",
      createdAt: new Date(),
      telegramUsername: "telegram_user",
      emailNotificationsEnabled: true,
      lastLoginAt: new Date(),
      accountPhoto: "https://example.com/presigned-url.jpg",
    };

    it("returns 200 with citizen profile when authenticated", async () => {
      citizenService.getCitizenById.mockResolvedValue(mockCitizen);

      await controller.getMe(makeReq({ sub: 1, kind: "citizen" }), res, next);

      expect(citizenService.getCitizenById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCitizen);
    });

    it("returns 401 when auth is missing", async () => {
      await controller.getMe(makeReq(undefined), res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 401 when auth.sub is missing", async () => {
      await controller.getMe(makeReq({ kind: "citizen" }), res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 404 when citizen not found", async () => {
      citizenService.getCitizenById.mockRejectedValue(
        new Error("Citizen not found")
      );

      await controller.getMe(makeReq({ sub: 999, kind: "citizen" }), res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Citizen not found" });
    });

    it("forwards unexpected errors", async () => {
      const boom = new Error("Database error");
      citizenService.getCitizenById.mockRejectedValue(boom);

      await controller.getMe(makeReq({ sub: 1, kind: "citizen" }), res, next);

      expect(next).toHaveBeenCalledWith(boom);
    });

    it("returns profile with presigned photo URL", async () => {
      const photoCitizen = {
        id: 1,
        emailNotificationsEnabled: false,
        accountPhoto:
          "https://merguven.ddns.net/profile.jpg?X-Amz-Signature=abc",
      };

      citizenService.getCitizenById.mockResolvedValue(photoCitizen);

      await controller.getMe(makeReq({ sub: 1, kind: "citizen" }), res, next);

      expect(res.json).toHaveBeenCalledWith(photoCitizen);
      expect(photoCitizen.accountPhoto).toContain("https://");
      expect(photoCitizen.accountPhoto).toContain("X-Amz-Signature");
    });
  });
});
