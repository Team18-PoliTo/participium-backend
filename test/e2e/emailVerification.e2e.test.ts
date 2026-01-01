// test/e2e/emailVerification.e2e.test.ts

// Mock rate limiters to prevent 429 errors in tests
jest.mock("../../src/middleware/rateLimiters", () => ({
  registrationLimiter: jest.fn((req, res, next) => next()),
  verificationLimiter: jest.fn((req, res, next) => next()),
  resendLimiter: jest.fn((req, res, next) => next()),
  loginLimiter: jest.fn((req, res, next) => next()),
  generalLimiter: jest.fn((req, res, next) => next()),
}));

// NOTE: EmailService mock doesn't work in e2e tests due to app loading order
// Tests will use real EmailService and fetch actual verification codes from DB

import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";

function nextDifferent6Digit(code: string, add = 1): string {
  // Guarantee a different 6-digit numeric string to avoid rare OTP collisions in tests.
  const n = /^\d{6}$/.test(code) ? parseInt(code, 10) : 0;
  return ((n + add) % 1_000_000).toString().padStart(6, "0");
}

describe("Email Verification E2E Tests", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  afterEach(async () => {
    // Clean up after each test instead of before
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    await citizenRepo.clear();
  });

  describe("POST /api/citizens/register", () => {
    it("should register citizen with PENDING status", async () => {
      const response = await request(app)
        .post("/api/citizens/register")
        .send({
          email: "newuser@example.com",
          username: "newuser",
          firstName: "New",
          lastName: "User",
          password: "password123",
        })
        .expect(201);

      expect(response.body).toMatchObject({
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        status: "PENDING",
        isEmailVerified: false,
      });
      expect(response.body.id).toBeDefined();
    });

    it("should normalize email to lowercase", async () => {
      const response = await request(app)
        .post("/api/citizens/register")
        .send({
          email: "UPPERCASE@EXAMPLE.COM",
          username: "testuser",
          firstName: "Test",
          lastName: "User",
          password: "password123",
        })
        .expect(201);

      expect(response.body.email).toBe("uppercase@example.com");
    });
  });

  describe("POST /api/email-verification/verify", () => {
    let userEmail: string;
    let verificationCode: string;

    beforeEach(async () => {
      userEmail = "verify@example.com";

      // Register a user first
      await request(app).post("/api/citizens/register").send({
        email: userEmail,
        username: "verifyuser",
        firstName: "Verify",
        lastName: "User",
        password: "password123",
      });

      // Get the actual verification code from the database
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", { email: userEmail })
        .getOne();

      verificationCode = citizen?.verificationCode || "123456";
    });

    it("should verify email with valid code", async () => {
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: verificationCode,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Email verified successfully",
      });

      // Verify user can now login
      const loginResponse = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: userEmail,
          password: "password123",
        })
        .expect(200);

      expect(loginResponse.body.access_token).toBeDefined();
    });

    it("should reject invalid verification code", async () => {
      const invalidCode = nextDifferent6Digit(verificationCode, 1);
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: invalidCode,
        })
        .expect(400);

      expect(response.body.error).toBe("Invalid verification code");
    });

    it("should reject verification for non-existent email", async () => {
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: "nonexistent@example.com",
          code: "123456",
        })
        .expect(404);

      expect(response.body.error).toBe("Citizen not found");
    });

    it("should validate code format (6 digits)", async () => {
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: "12345", // Only 5 digits
        })
        .expect(400);

      expect(response.body.error).toContain("exactly 6 digits");
    });

    it("should reject non-numeric codes", async () => {
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: "abc123",
        })
        .expect(400);

      expect(response.body.error).toContain("only numbers");
    });

    it("should handle already verified email gracefully", async () => {
      // Get the actual verification code from database
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", { email: userEmail })
        .getOne();

      const actualCode = citizen?.verificationCode || verificationCode;

      // Verify once
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: actualCode,
        })
        .expect(200);

      // Try to verify again
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: actualCode,
        })
        .expect(200);

      expect(response.body.message).toBe("Email already verified");
    });

    it("should enforce rate limiting on verification attempts", async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/email-verification/verify")
          .send({
            email: userEmail,
            // Must be a valid 6-digit numeric string, otherwise DTO validation
            // fails and the attempt counter is NOT incremented.
            code: nextDifferent6Digit(verificationCode, i + 1),
          })
          .expect(400);
      }

      // 4th attempt should be rate limited
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: "999999",
        })
        .expect(400);

      expect(response.body.error).toContain("Too many");
    });

    it("should reject expired verification code", async () => {
      // Manually set expired code in database
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo.findOne({
        where: { email: userEmail },
      });

      if (citizen) {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 31);
        citizen.verificationCodeExpiresAt = pastDate;
        await citizenRepo.save(citizen);
      }

      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: verificationCode,
        })
        .expect(400);

      expect(response.body.error).toContain("expired");
    });
  });

  describe("POST /api/email-verification/resend", () => {
    let userEmail: string;
    let verificationCode: string;

    beforeEach(async () => {
      userEmail = "resend@example.com";

      // Register a user first
      await request(app).post("/api/citizens/register").send({
        email: userEmail,
        username: "resenduser",
        firstName: "Resend",
        lastName: "User",
        password: "password123",
      });

      // Get the actual verification code from the database
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", { email: userEmail })
        .getOne();

      verificationCode = citizen?.verificationCode || "123456";
    });

    it("should resend verification code successfully", async () => {
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: userEmail,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Verification code sent");

      // Get the NEW verification code from database after resend
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", { email: userEmail })
        .getOne();

      const newCode = citizen?.verificationCode || verificationCode;

      // Verify that the new code works
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: newCode,
        })
        .expect(200);
    });

    it("should reject resend for already verified email", async () => {
      // Get current verification code
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", { email: userEmail })
        .getOne();

      const currentCode = citizen?.verificationCode || verificationCode;

      // Verify the email first
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: currentCode,
        })
        .expect(200);

      // Try to resend
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: userEmail,
        })
        .expect(400);

      expect(response.body.error).toBe("Email already verified");
    });

    it("should reject resend for non-existent email", async () => {
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: "nonexistent@example.com",
        })
        .expect(404);

      expect(response.body.error).toBe("Citizen not found");
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: "invalid-email",
        })
        .expect(400);

      expect(response.body.error).toContain("email");
    });

    it("should enforce rate limiting on resend requests", async () => {
      // Service behavior:
      // - Cooldown can block rapid resends (message "Please wait ...")
      // - Hard limit blocks after 5 resends within 1 hour ("Too many resend requests ...")
      //
      // To reliably test the hard limit without waiting real minutes, we manually
      // move `lastVerificationAttemptAt` back in time between requests to bypass cooldown.

      const citizenRepo = AppDataSource.getRepository(CitizenDAO);

      // Do 5 successful resends (bypassing cooldown each time)
      for (let i = 0; i < 5; i++) {
        const citizen = await citizenRepo.findOne({
          where: { email: userEmail },
        });
        if (citizen) {
          // 20 minutes ago: clears even the max 10-minute cooldown, but still within 1 hour
          citizen.lastVerificationAttemptAt = new Date(
            Date.now() - 20 * 60 * 1000
          );
          await citizenRepo.save(citizen);
        }

        await request(app)
          .post("/api/email-verification/resend")
          .send({ email: userEmail })
          .expect(200);
      }

      // Bypass cooldown before the 6th request as well, otherwise we might hit
      // the "Please wait X minutes..." cooldown instead of the hard limit.
      const citizenBefore6th = await citizenRepo.findOne({
        where: { email: userEmail },
      });
      if (citizenBefore6th) {
        citizenBefore6th.lastVerificationAttemptAt = new Date(
          Date.now() - 20 * 60 * 1000
        );
        await citizenRepo.save(citizenBefore6th);
      }

      // 6th should hit the hard limit
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({ email: userEmail })
        .expect(400);

      expect(response.body.error).toContain("Too many resend requests");
    });
  });

  describe("POST /api/auth/citizens/login - Email Verification Check", () => {
    let verifiedUser: { email: string; password: string; code?: string };
    let unverifiedUser: { email: string; password: string };

    beforeEach(async () => {
      verifiedUser = {
        email: "verified@example.com",
        password: "password123",
      };
      unverifiedUser = {
        email: "unverified@example.com",
        password: "password123",
      };

      // Create verified user
      await request(app).post("/api/citizens/register").send({
        email: verifiedUser.email,
        username: "verifieduser",
        firstName: "Verified",
        lastName: "User",
        password: verifiedUser.password,
      });

      // Get the verification code from the database
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", {
          email: verifiedUser.email,
        })
        .getOne();

      verifiedUser.code = citizen?.verificationCode || "123456";

      await request(app).post("/api/email-verification/verify").send({
        email: verifiedUser.email,
        code: verifiedUser.code,
      });

      // Create unverified user
      await request(app).post("/api/citizens/register").send({
        email: unverifiedUser.email,
        username: "unverifieduser",
        firstName: "Unverified",
        lastName: "User",
        password: unverifiedUser.password,
      });
    });

    it("should allow login for verified users", async () => {
      const response = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: verifiedUser.email,
          password: verifiedUser.password,
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.token_type).toBe("bearer");
    });

    it("should block login for unverified users", async () => {
      const response = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(403);

      expect(response.body.error).toBe("EMAIL_NOT_VERIFIED");
      expect(response.body.message).toBe(
        "Please verify your email before logging in"
      );
    });

    it("should still return invalid credentials for wrong password", async () => {
      const response = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: verifiedUser.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("Complete User Journey", () => {
    it("should complete full registration and verification flow", async () => {
      const userData = {
        email: "journey@example.com",
        username: "journeyuser",
        firstName: "Journey",
        lastName: "User",
        password: "password123",
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post("/api/citizens/register")
        .send(userData)
        .expect(201);

      expect(registerResponse.body.status).toBe("PENDING");
      expect(registerResponse.body.isEmailVerified).toBe(false);

      // Step 2: Try to login (should fail)
      await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(403);

      // Step 3: Get verification code and verify email
      const citizenRepo = AppDataSource.getRepository(CitizenDAO);
      const citizen = await citizenRepo
        .createQueryBuilder("citizen")
        .addSelect("citizen.verificationCode")
        .where("LOWER(citizen.email) = LOWER(:email)", {
          email: userData.email,
        })
        .getOne();

      const verificationCode = citizen?.verificationCode || "123456";

      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userData.email,
          code: verificationCode,
        })
        .expect(200);

      // Step 4: Login successfully
      const loginResponse = await request(app)
        .post("/api/auth/citizens/login")
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.access_token).toBeDefined();

      // Step 5: Check user profile
      const meResponse = await request(app)
        .get("/api/citizens/me")
        .set("Authorization", `Bearer ${loginResponse.body.access_token}`)
        .expect(200);

      expect(meResponse.body.email).toBe(userData.email);
      expect(meResponse.body.status).toBe("ACTIVE");
      expect(meResponse.body.isEmailVerified).toBe(true);
    });
  });
});
