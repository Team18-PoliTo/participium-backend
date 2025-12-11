import CitizenController from "../../src/controllers/citizenController";
import { Request, Response, NextFunction } from "express";
import * as classValidator from "class-validator";

describe("CitizenController", () => {
  const citizenService = {
    register: jest.fn(),
    getCitizenById: jest.fn(),
    updateCitizen: jest.fn(),
  } as any;

  const controller = new CitizenController(citizenService);
  const VALID_PWD = process.env.TEST_VALID_PASSWORD ?? "strongpwd";
  const INVALID_PWD = process.env.TEST_INVALID_PASSWORD ?? "123";

  const mockRes = (): Response => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const makeReq = (body: any = {}, auth: any = undefined): Request =>
    ({ body, auth }) as any;

  const validCitizen = {
    email: "citizen@city.com",
    username: "citizen",
    firstName: "City",
    lastName: "Zen",
    password: VALID_PWD,
  };

  const invalidCitizen = {
    email: "bad-email",
    username: "citizen",
    firstName: "City",
    lastName: "Zen",
    password: INVALID_PWD,
  };

  const next: NextFunction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it("register creates citizen and returns 201", async () => {
    citizenService.register.mockResolvedValue({ id: 1 });

    const req = makeReq(validCitizen);
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it("register returns 400 when validation fails", async () => {
    const req = makeReq(invalidCitizen);
    const res = mockRes();

    await controller.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(citizenService.register).not.toHaveBeenCalled();
  });

  it("register returns 409 when email exists", async () => {
    citizenService.register.mockRejectedValue(
      new Error("Citizen with this email already exists")
    );

    const req = makeReq({ ...validCitizen, email: "dup@city.com" });
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

    const req = makeReq({ ...validCitizen, username: "taken" });
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

    const req = makeReq(invalidCitizen);
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

    const req = makeReq(validCitizen);
    const res = mockRes();

    await controller.register(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  // ---------- GET ME ----------
  describe("getMe", () => {
    it("returns 200 with citizen profile when authenticated", async () => {
      const mockCitizen = {
        id: 1,
        ...validCitizen,
        status: "ACTIVE",
        createdAt: new Date(),
        telegramUsername: "telegram_user",
        emailNotificationsEnabled: true,
        lastLoginAt: new Date(),
        accountPhoto: "https://example.com/presigned-url.jpg",
      };

      citizenService.getCitizenById.mockResolvedValue(mockCitizen);

      const req = makeReq({}, { sub: 1, kind: "citizen" });
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(citizenService.getCitizenById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCitizen);
    });

    it("returns 401 when not authenticated", async () => {
      const req = makeReq({}, undefined);
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 401 when auth.sub is missing", async () => {
      const req = makeReq({}, { kind: "citizen" });
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 404 when citizen not found", async () => {
      citizenService.getCitizenById.mockRejectedValue(
        new Error("Citizen not found")
      );

      const req = makeReq({}, { sub: 999, kind: "citizen" });
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Citizen not found" });
    });

    it("forwards unexpected errors", async () => {
      const boom = new Error("Database error");
      citizenService.getCitizenById.mockRejectedValue(boom);

      const req = makeReq({}, { sub: 1, kind: "citizen" });
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(boom);
    });

    it("returns profile with presigned photo URL", async () => {
      const mockCitizen = {
        id: 1,
        emailNotificationsEnabled: false,
        accountPhoto:
          "https://merguven.ddns.net/profile.jpg?X-Amz-Signature=123",
      };

      citizenService.getCitizenById.mockResolvedValue(mockCitizen);

      const req = makeReq({}, { sub: 1, kind: "citizen" });
      const res = mockRes();

      await controller.getMe(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCitizen);
      expect(mockCitizen.accountPhoto).toContain("https://");
      expect(mockCitizen.accountPhoto).toContain("X-Amz-Signature");
    });
  });

  describe("updateMyProfile", () => {
    it("returns 200 with updated citizen", async () => {
      const citizenId = 1;

      const req = makeReq(
        {
          firstName: "UpdatedName",
          emailNotificationsEnabled: "true",
          accountPhoto: "temp/path.jpg",
        },
        { sub: citizenId, kind: "citizen" }
      );

      const res = mockRes();

      const updatedCitizen = {
        id: 1,
        firstName: "UpdatedName",
        emailNotificationsEnabled: true,
      };

      citizenService.updateCitizen.mockResolvedValue(updatedCitizen);

      await controller.updateMyProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedCitizen);
    });

    it("returns 401 when auth is missing", async () => {
      const req = makeReq({}, undefined);
      const res = mockRes();

      await controller.updateMyProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("forwards unexpected errors", async () => {
      const req = makeReq({}, { sub: 1, kind: "citizen" });
      const res = mockRes();

      const boom = new Error("Update failed");
      citizenService.updateCitizen.mockRejectedValue(boom);

      await controller.updateMyProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(boom);
    });
  });
});
