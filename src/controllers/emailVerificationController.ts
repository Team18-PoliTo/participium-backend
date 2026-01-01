import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import {
  VerifyEmailRequestDTO,
  ResendVerificationCodeRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import { ICitizenService } from "../services/ICitizenService";

class EmailVerificationController {
  constructor(private readonly citizenService: ICitizenService) {}

  /**
   * Verify email with code
   */
  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = plainToInstance(VerifyEmailRequestDTO, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length) {
        const msg: string = errors
          .flatMap((e: ValidationError) => Object.values(e.constraints ?? {}))
          .join("; ");
        res.status(400).json({ error: msg });
        return;
      }

      const result = await this.citizenService.verifyEmail(dto.email, dto.code);
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Handle specific error messages
        if (err.message === "Citizen not found") {
          res.status(404).json({ error: err.message });
          return;
        }
        if (
          err.message.includes("Too many verification attempts") ||
          err.message.includes("expired") ||
          err.message.includes("Invalid verification code") ||
          err.message.includes("No verification code found")
        ) {
          res.status(400).json({ error: err.message });
          return;
        }
      }
      next(err);
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = plainToInstance(ResendVerificationCodeRequestDTO, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length) {
        const msg: string = errors
          .flatMap((e: ValidationError) => Object.values(e.constraints ?? {}))
          .join("; ");
        res.status(400).json({ error: msg });
        return;
      }

      const result = await this.citizenService.resendVerificationCode(
        dto.email
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Handle specific error messages
        if (err.message === "Citizen not found") {
          res.status(404).json({ error: err.message });
          return;
        }
        if (
          err.message.includes("already verified") ||
          err.message.includes("Too many resend requests") ||
          err.message.includes("Failed to send verification email") ||
          err.message.includes("Please wait") // cooldown UX error
        ) {
          res.status(400).json({ error: err.message });
          return;
        }
      }
      next(err);
    }
  }
}

export default EmailVerificationController;
