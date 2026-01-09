import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

/**
 * Rate limiting middleware for email verification endpoints
 * Protects against abuse and conserves email sending credits
 */

/**
 * In Jest/e2e tests we don't want cross-test interference from IP-based rate limiting.
 * Jest runs all requests from the same process/IP, so limits will trip and cause
 * cascading 429/404 failures unrelated to business logic.
 */
const isTestEnv =
  process.env.NODE_ENV === "test" ||
  typeof process.env.JEST_WORKER_ID === "string";

const passThrough = (_req: Request, _res: Response, next: NextFunction) =>
  next();

/**
 * Rate limiter for citizen registration
 * Limit: 5 registrations per IP per hour
 */
export const registrationLimiter = isTestEnv
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 requests per window
      message: {
        error:
          "Too many accounts created from this IP. Please try again in an hour.",
      },
      standardHeaders: true, // Return rate limit info in headers
      legacyHeaders: false,
      // Skip successful requests (only count failed attempts)
      skipSuccessfulRequests: false,
      // Skip if user already exists (don't penalize checking)
      skip: (_req) => {
        // You could check if it's a duplicate email check here
        return false;
      },
    });

/**
 * Rate limiter for email verification attempts
 * Limit: 15 verification attempts per IP per hour (across all users)
 * This is in addition to per-user limits (5 attempts per 15 minutes)
 */
export const verificationLimiter = isTestEnv
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 15, // 15 requests per window
      message: {
        error:
          "Too many verification attempts from this IP. Please try again later.",
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip successful verifications (only count attempts)
      skipSuccessfulRequests: true,
    });

/**
 * Rate limiter for resending verification codes
 * Limit: 20 resend requests per IP per hour (across all users)
 * This prevents abuse while allowing legitimate users flexibility
 */
export const resendLimiter = isTestEnv
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 requests per window
      message: {
        error:
          "Too many resend requests from this IP. Please try again in an hour.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Stricter rate limiter for login attempts
 * Limit: 10 login attempts per IP per 15 minutes
 */
export const loginLimiter = isTestEnv
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 requests per window
      message: {
        error: "Too many login attempts. Please try again in 15 minutes.",
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Only count failed logins
      skipSuccessfulRequests: true,
    });

/**
 * General API rate limiter (fallback)
 * Limit: 100 requests per IP per 15 minutes
 */
export const generalLimiter = isTestEnv
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        error: "Too many requests. Please try again later.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Usage in routes:
 *
 * import { registrationLimiter, verificationLimiter, resendLimiter } from '../middleware/rateLimiters';
 *
 * router.post('/register', registrationLimiter, controller.register);
 * router.post('/verify', verificationLimiter, controller.verify);
 * router.post('/resend', resendLimiter, controller.resend);
 */
