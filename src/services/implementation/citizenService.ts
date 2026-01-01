import { CitizenMapper } from "../../mappers/CitizenMapper";
import { CitizenDTO } from "../../models/dto/CitizenDTO";
import { RegisterCitizenRequestDTO } from "../../models/dto/ValidRequestDTOs";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import { ICitizenService } from "../ICitizenService";
import { LoginRequestDTO } from "../../models/dto/LoginRequestDTO";
import MinIoService from "../MinIoService";
import { PROFILE_BUCKET } from "../../config/minioClient";
import EmailService from "../EmailService";

class CitizenService implements ICitizenService {
  static updateCitizen: any;
  private emailService: EmailService;

  constructor(
    private readonly citizenRepository: ICitizenRepository = new CitizenRepository()
  ) {
    this.emailService = new EmailService();
  }

  async register(registerData: RegisterCitizenRequestDTO): Promise<CitizenDTO> {
    const email = registerData.email.trim().toLowerCase();
    const username = registerData.username.trim().toLowerCase();

    // Validate email quality (block disposable emails)
    const emailValidation = this.emailService.validateEmailQuality(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.error || "Invalid email address");
    }

    const existingCitizenByEmail =
      await this.citizenRepository.findByEmail(email);
    if (existingCitizenByEmail)
      throw new Error("Citizen with this email already exists");

    const existingCitizenByUsername =
      await this.citizenRepository.findByUsername(username);
    if (existingCitizenByUsername)
      throw new Error("Citizen with this username already exists");

    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    // Generate verification code
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiresAt =
      this.emailService.getVerificationCodeExpiry();

    const newCitizen = await this.citizenRepository.create({
      email,
      username,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      password: hashedPassword,
      status: "PENDING",
      isEmailVerified: false,
      verificationCode,
      verificationCodeExpiresAt,
    });

    // Send verification email (don't block on this)
    this.emailService
      .sendVerificationEmail(email, verificationCode, registerData.firstName)
      .catch((err) => {
        console.error("Failed to send verification email:", err);
        // In production, you might want to queue this for retry
      });

    return await CitizenMapper.toDTO(newCitizen);
  }

  async getCitizenById(id: number): Promise<CitizenDTO> {
    const citizen = await this.citizenRepository.findById(id);
    if (!citizen) {
      throw new Error("Citizen not found");
    }
    return await CitizenMapper.toDTO(citizen);
  }

  async login({
    email,
    password,
  }: LoginRequestDTO): Promise<{ access_token: string; token_type: "bearer" }> {
    const normalizedEmail = email.trim().toLowerCase();
    const citizen = await this.citizenRepository.findByEmail(normalizedEmail, {
      withPassword: true,
    });
    if (!citizen) throw new Error("Invalid credentials");

    const status = citizen.status ?? "PENDING";

    // Check if email is verified
    if (status === "PENDING" || !citizen.isEmailVerified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    if (status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, citizen.password);
    if (!ok) {
      await this.citizenRepository.update(citizen.id, {
        failedLoginAttempts: (citizen.failedLoginAttempts ?? 0) + 1,
      });
      throw new Error("Invalid credentials");
    }

    await this.citizenRepository.update(citizen.id, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    });

    const secret = process.env.JWT_SECRET || "dev-secret";
    const token = jwt.sign(
      {
        sub: citizen.id,
        kind: "citizen",
        email: citizen.email,
        status: citizen.status,
      },
      secret,
      { expiresIn: "1h" }
    );

    return { access_token: token, token_type: "bearer" };
  }

  async updateCitizen(
    id: number,
    data: {
      email?: string | null;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      telegramUsername?: string | null;
      emailNotificationsEnabled?: boolean;
      photoPath?: string | null;
    }
  ): Promise<CitizenDTO> {
    const citizen = await this.citizenRepository.findById(id);
    if (!citizen) throw new Error("Citizen not found");

    const normalize = (v: any) => {
      if (v === undefined) return undefined;
      if (v === "" || v === "null" || v === null) return null;
      return v;
    };

    const assignNormalized = (
      key: string,
      val: any,
      transform?: (v: any) => any
    ) => {
      if (val === undefined) return;
      const normalized = normalize(val);
      updatePayload[key] = transform ? transform(normalized) : normalized;
    };

    const deletePhotoIfExists = async () => {
      if (!citizen.accountPhotoUrl) return;
      try {
        await MinIoService.deleteFile(PROFILE_BUCKET, citizen.accountPhotoUrl);
      } catch (err: any) {
        console.warn(
          `[CitizenService] Failed to delete profile photo ${citizen.accountPhotoUrl}:`,
          err?.message || err
        );
      }
    };

    const updatePayload: any = {};

    assignNormalized("email", data.email, (v) => (v ? v.toLowerCase() : null));
    assignNormalized("username", data.username, (v) =>
      v ? v.toLowerCase() : null
    );
    assignNormalized("firstName", data.firstName);
    assignNormalized("lastName", data.lastName);
    assignNormalized("telegramUsername", data.telegramUsername);

    if (data.emailNotificationsEnabled !== null) {
      updatePayload.emailNotificationsEnabled = data.emailNotificationsEnabled;
    }

    // PHOTO SECTION (reduced complexity)
    if (data.photoPath !== undefined) {
      await deletePhotoIfExists();
      updatePayload.accountPhotoUrl = data.photoPath ?? null;
    }

    await this.citizenRepository.update(id, updatePayload);

    const updatedCitizen = await this.citizenRepository.findById(id);
    if (!updatedCitizen) throw new Error("Citizen not found after update");

    return await CitizenMapper.toDTO(updatedCitizen);
  }

  /**
   * Verify email with code
   */
  async verifyEmail(
    email: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Find citizen with verification code
    const citizen = await this.citizenRepository.findByEmail(normalizedEmail, {
      withVerificationCode: true,
    });

    if (!citizen) {
      throw new Error("Citizen not found");
    }

    // Check if already verified
    if (citizen.isEmailVerified && citizen.status === "ACTIVE") {
      return { success: true, message: "Email already verified" };
    }

    // Rate limiting: check verification attempts
    const now = new Date();
    if (citizen.lastVerificationAttemptAt) {
      const timeSinceLastAttempt =
        now.getTime() - citizen.lastVerificationAttemptAt.getTime();
      const fifteenMinutes = 15 * 60 * 1000;

      // Reset counter if more than 15 minutes have passed
      if (timeSinceLastAttempt > fifteenMinutes) {
        await this.citizenRepository.update(citizen.id, {
          verificationAttempts: 0,
        });
      } else if ((citizen.verificationAttempts ?? 0) >= 3) {
        const remainingTime = Math.ceil(
          (fifteenMinutes - timeSinceLastAttempt) / 1000 / 60
        );
        throw new Error(
          `Too many verification attempts. Please try again in ${remainingTime} minutes.`
        );
      }
    }

    // Check if code exists
    if (!citizen.verificationCode) {
      throw new Error("No verification code found. Please request a new one.");
    }

    // Check if code has expired
    if (
      !citizen.verificationCodeExpiresAt ||
      citizen.verificationCodeExpiresAt < now
    ) {
      throw new Error(
        "Verification code has expired. Please request a new one."
      );
    }

    // Verify the code
    if (citizen.verificationCode !== code) {
      // Increment failed attempts
      await this.citizenRepository.update(citizen.id, {
        verificationAttempts: (citizen.verificationAttempts ?? 0) + 1,
        lastVerificationAttemptAt: now,
      });
      throw new Error("Invalid verification code");
    }

    // Success! Activate the account
    await this.citizenRepository.update(citizen.id, {
      isEmailVerified: true,
      status: "ACTIVE",
      verificationCode: undefined,
      verificationCodeExpiresAt: undefined,
      verificationAttempts: 0,
      lastVerificationAttemptAt: undefined,
    });

    return { success: true, message: "Email verified successfully" };
  }

  /**
   * Resend verification code with improved UX-friendly rate limiting
   */
  async resendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const citizen = await this.citizenRepository.findByEmail(normalizedEmail);

    if (!citizen) {
      throw new Error("Citizen not found");
    }

    // Check if already verified
    if (citizen.isEmailVerified && citizen.status === "ACTIVE") {
      throw new Error("Email already verified");
    }

    const now = new Date();
    const lastAttempt = citizen.lastVerificationAttemptAt;
    const attemptCount = citizen.verificationAttempts ?? 0;

    // Graduated cooldown strategy: 0, 2, 2, 5, 10 minutes
    const cooldownMinutes = [0, 2, 2, 5, 10];
    const requiredCooldown =
      cooldownMinutes[Math.min(attemptCount, cooldownMinutes.length - 1)];

    // Check if cooldown period has passed
    if (lastAttempt && requiredCooldown > 0) {
      const timeSinceLastAttempt =
        (now.getTime() - lastAttempt.getTime()) / 1000 / 60; // minutes

      if (timeSinceLastAttempt < requiredCooldown) {
        const remainingMinutes = Math.ceil(
          requiredCooldown - timeSinceLastAttempt
        );
        throw new Error(
          `Please wait ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""} before requesting another code.`
        );
      }
    }

    // Hard limit: Max 5 resends per hour (security measure)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (lastAttempt && lastAttempt < oneHourAgo) {
      // Reset counter if more than 1 hour has passed
      await this.citizenRepository.update(citizen.id, {
        verificationAttempts: 0,
      });
    } else if (attemptCount >= 5) {
      // Still within 1 hour and hit limit
      throw new Error(
        "Too many resend requests. Please try again later or contact support if you're having issues."
      );
    }

    // Generate new verification code
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiresAt =
      this.emailService.getVerificationCodeExpiry();

    await this.citizenRepository.update(citizen.id, {
      verificationCode,
      verificationCodeExpiresAt,
      verificationAttempts: attemptCount + 1,
      lastVerificationAttemptAt: now,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        normalizedEmail,
        verificationCode,
        citizen.firstName
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }

    // Calculate next cooldown for user info
    const nextCooldown =
      cooldownMinutes[Math.min(attemptCount + 1, cooldownMinutes.length - 1)];
    const cooldownMessage =
      nextCooldown > 0
        ? ` Next resend available in ${nextCooldown} minutes.`
        : "";

    return {
      success: true,
      message: `Verification code sent successfully.${cooldownMessage}`,
    };
  }
}

export const citizenService = new CitizenService();
export default CitizenService;
