import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import {
  VerifyEmailRequestDTO,
  ResendVerificationCodeRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import { ICitizenService } from "../services/ICitizenService";

async function validateDto<T extends object>(
  cls: new () => T,
  body: unknown
): Promise<{ dto?: T; error?: string }> {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (!errors.length) return { dto };

  const msg: string = errors
    .flatMap((e: ValidationError) => Object.values(e.constraints ?? {}))
    .join("; ");
  return { error: msg };
}

function respondKnownErrors(
  err: unknown,
  res: Response,
  known400Matchers: Array<(msg: string) => boolean>
): boolean {
  if (!(err instanceof Error)) return false;

  if (err.message === "Citizen not found") {
    res.status(404).json({ error: err.message });
    return true;
  }

  if (known400Matchers.some((m) => m(err.message))) {
    res.status(400).json({ error: err.message });
    return true;
  }

  return false;
}

function handleKnownErrors(
  err: unknown,
  res: Response,
  next: NextFunction,
  known400Matchers: Array<(msg: string) => boolean>
): void {
  const handled = respondKnownErrors(err, res, known400Matchers);
  if (!handled) next(err);
}

const VERIFY_KNOWN_400_MATCHERS: Array<(msg: string) => boolean> = [
  (m) => m.includes("Too many verification attempts"),
  (m) => m.includes("expired"),
  (m) => m.includes("Invalid verification code"),
  (m) => m.includes("No verification code found"),
];

const RESEND_KNOWN_400_MATCHERS: Array<(msg: string) => boolean> = [
  (m) => m.includes("already verified"),
  (m) => m.includes("Too many resend requests"),
  (m) => m.includes("Failed to send verification email"),
  (m) => m.includes("Please wait"),
];

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
      const { dto, error } = await validateDto(VerifyEmailRequestDTO, req.body);
      if (error || !dto) {
        res.status(400).json({ error: error ?? "Invalid request" });
        return;
      }

      const result = await this.citizenService.verifyEmail(dto.email, dto.code);
      res.status(200).json(result);
    } catch (err: unknown) {
      handleKnownErrors(err, res, next, VERIFY_KNOWN_400_MATCHERS);
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
      const { dto, error } = await validateDto(
        ResendVerificationCodeRequestDTO,
        req.body
      );
      if (error || !dto) {
        res.status(400).json({ error: error ?? "Invalid request" });
        return;
      }

      const result = await this.citizenService.resendVerificationCode(
        dto.email
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      handleKnownErrors(err, res, next, RESEND_KNOWN_400_MATCHERS);
    }
  }
}

export default EmailVerificationController;
