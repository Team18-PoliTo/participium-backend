import { Router } from "express";
import EmailVerificationController from "../controllers/emailVerificationController";
import CitizenService from "../services/implementation/citizenService";
import CitizenRepository from "../repositories/implementation/CitizenRepository";
import { verificationLimiter, resendLimiter } from "../middleware/rateLimiters";

const router = Router();

// Dependency Injection Setup
const citizenRepository = new CitizenRepository();
const citizenService = new CitizenService(citizenRepository);
const emailVerificationController = new EmailVerificationController(
  citizenService
);

/**
 * @swagger
 * /email-verification/verify:
 *   post:
 *     summary: Verify email with code
 *     description: Verify a citizen's email address using the 6-digit code sent to their email. Code is valid for 30 minutes. Rate limited to 3 attempts per 15 minutes.
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: "123456"
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Invalid code, expired code, or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid verification code"
 *       404:
 *         description: Citizen not found
 */
router.post(
  "/verify",
  verificationLimiter, // IP-based rate limiting
  emailVerificationController.verifyEmail.bind(emailVerificationController)
);

/**
 * @swagger
 * /email-verification/resend:
 *   post:
 *     summary: Resend verification code
 *     description: Request a new verification code to be sent to the email address. Rate limited to 3 requests per hour.
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification code sent successfully"
 *       400:
 *         description: Email already verified or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email already verified"
 *       404:
 *         description: Citizen not found
 */
router.post(
  "/resend",
  resendLimiter, // IP-based rate limiting
  emailVerificationController.resendVerificationCode.bind(
    emailVerificationController
  )
);

export default router;
