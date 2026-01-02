import EmailService from "../../../src/services/EmailService";

describe("EmailService", () => {
  let emailService: EmailService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.RESEND_API_KEY = "re_123456789";
    process.env.RESEND_FROM_EMAIL = "test@example.com";

    emailService = new EmailService();

    mockSend = jest.fn();
    (emailService as any).resend = {
      emails: {
        send: mockSend,
      },
    };
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  describe("constructor", () => {
    it("warns if API key is missing", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      delete process.env.RESEND_API_KEY;
      
      try {
     
        new EmailService();
      } catch (error) {
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("RESEND_API_KEY not found")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("sendVerificationEmail", () => {
    it("sends an email successfully", async () => {
      mockSend.mockResolvedValue({ id: "123" });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await emailService.sendVerificationEmail(
        "test@example.com",
        "123456",
        "John"
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Verify Your Participium Account",
          html: expect.stringContaining("123456"),
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Verification email sent")
      );
      consoleSpy.mockRestore();
    });

    it("throws error when sending fails", async () => {
      mockSend.mockRejectedValue(new Error("API Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        emailService.sendVerificationEmail("test@example.com", "123456", "John")
      ).rejects.toThrow("Failed to send verification email");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("generateVerificationCode", () => {
    it("returns a 6-digit string", () => {
      const code = emailService.generateVerificationCode();
      expect(typeof code).toBe("string");
      expect(code).toHaveLength(6);
      expect(Number(code)).not.toBeNaN();
    });
  });

  describe("getVerificationCodeExpiry", () => {
    it("returns a date 30 minutes in the future", () => {
      const now = new Date();
      const expiry = emailService.getVerificationCodeExpiry();
      const diffMinutes = (expiry.getTime() - now.getTime()) / 1000 / 60;
      expect(diffMinutes).toBeCloseTo(30, 0); 
    });
  });

  describe("validateEmailQuality", () => {
    it("returns valid for standard emails", () => {
      const result = emailService.validateEmailQuality("user@gmail.com");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for malformed emails", () => {
      const result = emailService.validateEmailQuality("invalid-email");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("checks for disposable domains", () => {
      const result = emailService.validateEmailQuality("test@mailinator.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Temporary email addresses");
    });

    it("warns on role-based emails", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const result = emailService.validateEmailQuality("admin@company.com");
      expect(result.valid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Role-based email detected")
      );
      consoleSpy.mockRestore();
    });
  });
});
