import EmailVerificationController from "../../../src/controllers/emailVerificationController";
import { Request, Response } from "express";

describe("EmailVerificationController", () => {
  let controller: EmailVerificationController;
  let mockCitizenService: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    mockCitizenService = {
      verifyEmail: jest.fn(),
      resendVerificationCode: jest.fn(),
    };
    controller = new EmailVerificationController(mockCitizenService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("verifyEmail", () => {
    it("returns 200 on success", async () => {
      req = { body: { email: "test@test.com", code: "123456" } };
      mockCitizenService.verifyEmail.mockResolvedValue({ message: "Verified" });

      await controller.verifyEmail(req as Request, res as Response, next);

      expect(mockCitizenService.verifyEmail).toHaveBeenCalledWith(
        "test@test.com",
        "123456"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Verified" });
    });

    it("returns 400 on validation error", async () => {
      req = { body: { email: "invalid-email" } }; 
      await controller.verifyEmail(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it("handles 'Citizen not found' as 404", async () => {
      req = { body: { email: "test@test.com", code: "123456" } };
      mockCitizenService.verifyEmail.mockRejectedValue(new Error("Citizen not found"));

      await controller.verifyEmail(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Citizen not found" });
    });

    it("handles known errors as 400", async () => {
      req = { body: { email: "test@test.com", code: "123456" } };
      const errors = [
        "Too many verification attempts",
        "Code expired",
        "Invalid verification code",
        "No verification code found"
      ];

      for (const msg of errors) {
        mockCitizenService.verifyEmail.mockRejectedValueOnce(new Error(msg));
        await controller.verifyEmail(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: msg });
        jest.clearAllMocks();
      }
    });

    it("forwards unknown errors", async () => {
      req = { body: { email: "test@test.com", code: "123456" } };
      const err = new Error("Database fail");
      mockCitizenService.verifyEmail.mockRejectedValue(err);

      await controller.verifyEmail(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("resendVerificationCode", () => {
    it("returns 200 on success", async () => {
      req = { body: { email: "test@test.com" } };
      mockCitizenService.resendVerificationCode.mockResolvedValue({ message: "Sent" });

      await controller.resendVerificationCode(req as Request, res as Response, next);

      expect(mockCitizenService.resendVerificationCode).toHaveBeenCalledWith("test@test.com");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 on validation error", async () => {
      req = { body: {} }; 
      await controller.resendVerificationCode(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("handles 'Citizen not found' as 404", async () => {
      req = { body: { email: "test@test.com" } };
      mockCitizenService.resendVerificationCode.mockRejectedValue(new Error("Citizen not found"));

      await controller.resendVerificationCode(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles known errors as 400", async () => {
      req = { body: { email: "test@test.com" } };
      const errors = [
        "Account already verified",
        "Too many resend requests",
        "Failed to send verification email",
        "Please wait 2 minutes"
      ];

      for (const msg of errors) {
        mockCitizenService.resendVerificationCode.mockRejectedValueOnce(new Error(msg));
        await controller.resendVerificationCode(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: msg });
        jest.clearAllMocks();
      }
    });

    it("forwards unknown errors", async () => {
      req = { body: { email: "test@test.com" } };
      const err = new Error("Unexpected");
      mockCitizenService.resendVerificationCode.mockRejectedValue(err);
      await controller.resendVerificationCode(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(err);
    });
    
    it("ignores non-Error throws", async () => {
       req = { body: { email: "test@test.com" } };
       mockCitizenService.resendVerificationCode.mockRejectedValue("String error");
       await controller.resendVerificationCode(req as Request, res as Response, next);
       expect(res.status).not.toHaveBeenCalled();
       expect(next).toHaveBeenCalledWith("String error");
    });
  });
});