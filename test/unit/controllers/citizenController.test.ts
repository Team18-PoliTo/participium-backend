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
    it("returns 200 with citizen profile when authenticated", async () => {
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
      citizenService.getCitizenById.mockResolvedValue(mockCitizen);
      const req = {
        auth: { sub: 1, kind: "citizen" },
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCitizen);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      const req = {
        auth: undefined,
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when auth.sub is missing", async () => {
      const req = {
        auth: { kind: "citizen" },
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 404 when citizen not found", async () => {
      citizenService.getCitizenById.mockRejectedValue(
        new Error("Citizen not found")
      );
      const req = {
        auth: { sub: 999, kind: "citizen" },
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).toHaveBeenCalledWith(999);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Citizen not found" });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards unexpected errors", async () => {
      const boom = new Error("Database error");
      citizenService.getCitizenById.mockRejectedValue(boom);
      const req = {
        auth: { sub: 1, kind: "citizen" },
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).toHaveBeenCalledWith(1);
      expect(next).toHaveBeenCalledWith(boom);
    });

    it("returns profile with all fields including presigned photo URL", async () => {
      const mockCitizen = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE" as const,
        createdAt: new Date("2025-01-01"),
        telegramUsername: "test_telegram",
        emailNotificationsEnabled: false,
        lastLoginAt: new Date("2025-11-26"),
        accountPhoto:
          "https://merguven.ddns.net:9000/profile-photos/citizens/1/profile.jpg?X-Amz-Signature=...",
      };
      citizenService.getCitizenById.mockResolvedValue(mockCitizen);
      const req = {
        auth: { sub: 1, kind: "citizen" },
      } as any;
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCitizen);
      expect(mockCitizen.accountPhoto).toContain("https://");
      expect(mockCitizen.accountPhoto).toContain("X-Amz-Signature");
    });
  });
});
