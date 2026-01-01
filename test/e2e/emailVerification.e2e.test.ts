// test/e2e/emailVerification.e2e.test.ts
import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import CitizenDAO from "../../src/models/dao/CitizenDAO";

// Mock EmailService to prevent actual emails being sent
jest.mock("../../src/services/EmailService", () => {
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

  beforeEach(async () => {
    // Clean up citizens table before each test
    const citizenRepo = AppDataSource.getRepository(CitizenDAO);
    await citizenRepo.delete({});
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
      verificationCode = "123456";

      // Register a user first
      await request(app).post("/api/citizens/register").send({
        email: userEmail,
        username: "verifyuser",
        firstName: "Verify",
        lastName: "User",
        password: "password123",
      });
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
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: "999999",
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
      // Verify once
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: verificationCode,
        })
        .expect(200);

      // Try to verify again
      const response = await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: verificationCode,
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
            code: "wrong" + i,
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

      expect(response.body.error).toContain("Too many verification attempts");
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
    });

    it("should resend verification code successfully", async () => {
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: userEmail,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Verification code sent successfully",
      });
    });

    it("should reject resend for already verified email", async () => {
      // Verify the email first
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userEmail,
          code: "123456",
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
      // Make 3 resend requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/email-verification/resend")
          .send({
            email: userEmail,
          })
          .expect(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post("/api/email-verification/resend")
        .send({
          email: userEmail,
        })
        .expect(400);

      expect(response.body.error).toContain("Too many resend requests");
    });
  });

  describe("POST /api/auth/citizens/login - Email Verification Check", () => {
    let verifiedUser: { email: string; password: string };
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

      await request(app).post("/api/email-verification/verify").send({
        email: verifiedUser.email,
        code: "123456",
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

      // Step 3: Verify email
      await request(app)
        .post("/api/email-verification/verify")
        .send({
          email: userData.email,
          code: "123456",
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
