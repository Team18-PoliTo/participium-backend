// test/unit/services/emailVerification.test.ts
jest.mock("../../../src/services/EmailService", () => {
  return jest.fn().mockImplementation(() => ({
    generateVerificationCode: jest.fn(() => "123456"),
    getVerificationCodeExpiry: jest.fn(() => {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 30);
      return expiry;
    }),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  }));
});

jest.mock("bcrypt", () => ({
  __esModule: true,
  hash: jest.fn(async () => "hashed-pass"),
  compare: jest.fn(async () => true),
  default: {
    hash: jest.fn(async () => "hashed-pass"),
    compare: jest.fn(async () => true),
  },
}));

jest.mock("../../../src/mappers/CitizenMapper", () => ({
  CitizenMapper: {
    toDTO: jest.fn(async (u: any) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status ?? "PENDING",
      isEmailVerified: u.isEmailVerified ?? false,
      createdAt: u.createdAt,
      telegramUsername: u.telegramUsername ?? undefined,
      emailNotificationsEnabled: u.emailNotificationsEnabled ?? undefined,
      accountPhoto: u.accountPhotoUrl
        ? `https://presigned-url.com/${u.accountPhotoUrl}`
        : undefined,
      lastLoginAt: u.lastLoginAt ?? undefined,
    })),
  },
}));

import CitizenService from "../../../src/services/implementation/citizenService";
import { ICitizenRepository } from "../../../src/repositories/ICitizenRepository";
import CitizenDAO from "../../../src/models/dao/CitizenDAO";

describe("CitizenService - Email Verification", () => {
  let repo: jest.Mocked<ICitizenRepository>;
  let service: CitizenService;

  beforeEach(() => {
    jest.clearAllMocks();

    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
    } as any;

    service = new CitizenService(repo);
  });

  describe("register", () => {
    it("should create user with PENDING status and send verification email", async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.findByUsername.mockResolvedValue(null);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        password: "hashed-pass",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: "123456",
        verificationCodeExpiresAt: new Date(),
        createdAt: new Date(),
      };

      repo.create.mockResolvedValue(mockCitizen as CitizenDAO);

      const result = await service.register({
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        password: "password123",
      });

      expect(result.status).toBe("PENDING");
      expect(result.isEmailVerified).toBe(false);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          username: "testuser",
          status: "PENDING",
          isEmailVerified: false,
          verificationCode: "123456",
        })
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully with valid code", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: "123456",
        verificationCodeExpiresAt: futureDate,
        verificationAttempts: 0,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);
      repo.update.mockResolvedValue(undefined);

      const result = await service.verifyEmail("test@example.com", "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Email verified successfully");
      expect(repo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          isEmailVerified: true,
          status: "ACTIVE",
          verificationAttempts: 0,
        })
      );
    });

    it("should reject invalid verification code", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: "123456",
        verificationCodeExpiresAt: futureDate,
        verificationAttempts: 0,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.verifyEmail("test@example.com", "wrong-code")
      ).rejects.toThrow("Invalid verification code");

      expect(repo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          verificationAttempts: 1,
          lastVerificationAttemptAt: expect.any(Date),
        })
      );
    });

    it("should reject expired verification code", async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 31);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: "123456",
        verificationCodeExpiresAt: pastDate,
        verificationAttempts: 0,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow("Verification code has expired");
    });

    it("should enforce rate limiting (3 attempts per 15 minutes)", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);

      const recentAttempt = new Date();
      recentAttempt.setMinutes(recentAttempt.getMinutes() - 5);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: "123456",
        verificationCodeExpiresAt: futureDate,
        verificationAttempts: 3,
        lastVerificationAttemptAt: recentAttempt,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow(/Too many verification attempts/);
    });

    it("should return success if already verified", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "ACTIVE",
        isEmailVerified: true,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      const result = await service.verifyEmail("test@example.com", "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Email already verified");
    });

    it("should throw error if citizen not found", async () => {
      repo.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyEmail("notfound@example.com", "123456")
      ).rejects.toThrow("Citizen not found");
    });

    it("should throw error if no verification code exists", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationCode: undefined,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow("No verification code found");
    });
  });

  describe("resendVerificationCode", () => {
    it("should resend verification code successfully", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationAttempts: 0,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);
      repo.update.mockResolvedValue(undefined);

      const result = await service.resendVerificationCode("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Verification code sent successfully");
      expect(repo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          verificationCode: "123456",
          verificationAttempts: 1,
          lastVerificationAttemptAt: expect.any(Date),
        })
      );
    });

    it("should reject if email already verified", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "ACTIVE",
        isEmailVerified: true,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.resendVerificationCode("test@example.com")
      ).rejects.toThrow("Email already verified");
    });

    it("should enforce rate limiting (3 resends per hour)", async () => {
      const recentAttempt = new Date();
      recentAttempt.setMinutes(recentAttempt.getMinutes() - 30);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationAttempts: 3,
        lastVerificationAttemptAt: recentAttempt,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.resendVerificationCode("test@example.com")
      ).rejects.toThrow("Too many resend requests");
    });

    it("should throw error if citizen not found", async () => {
      repo.findByEmail.mockResolvedValue(null);

      await expect(
        service.resendVerificationCode("notfound@example.com")
      ).rejects.toThrow("Citizen not found");
    });

    it("should reset counter after 1 hour", async () => {
      const oldAttempt = new Date();
      oldAttempt.setHours(oldAttempt.getHours() - 2);

      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        status: "PENDING",
        isEmailVerified: false,
        verificationAttempts: 5,
        lastVerificationAttemptAt: oldAttempt,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);
      repo.update.mockResolvedValue(undefined);

      const result = await service.resendVerificationCode("test@example.com");

      expect(result.success).toBe(true);
      // Should reset counter first, then increment
      expect(repo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          verificationAttempts: 0,
        })
      );
    });
  });

  describe("login", () => {
    it("should block login if email not verified", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        password: "hashed-pass",
        status: "PENDING",
        isEmailVerified: false,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);

      await expect(
        service.login({
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow("EMAIL_NOT_VERIFIED");
    });

    it("should allow login if email verified and status ACTIVE", async () => {
      const mockCitizen: Partial<CitizenDAO> = {
        id: 1,
        email: "test@example.com",
        password: "hashed-pass",
        status: "ACTIVE",
        isEmailVerified: true,
        failedLoginAttempts: 0,
      };

      repo.findByEmail.mockResolvedValue(mockCitizen as CitizenDAO);
      repo.update.mockResolvedValue(undefined);

      const result = await service.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.access_token).toBeDefined();
      expect(result.token_type).toBe("bearer");
    });
  });
});
