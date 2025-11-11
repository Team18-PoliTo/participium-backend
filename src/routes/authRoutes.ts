import { Router } from "express";
import AuthController from "../controllers/authController";
import CitizenService from "../services/implementation/citizenService";
import CitizenRepository from "../repositories/implementation/CitizenRepository";
import InternalUserService from "../services/internalUserService";
import InternalUserRepository from "../repositories/InternalUserRepository";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

const citizenRepository = new CitizenRepository();
const citizenService = new CitizenService(citizenRepository);
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const authController = new AuthController(
  citizenService,
  internalUserService,
  citizenRepository,
  internalUserRepository
);

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 * components:
 *   schemas:
 *     LoginRequestDTO:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     AccessTokenResponse:
 *       type: object
 *       properties:
 *         access_token:
 *           type: string
 *         token_type:
 *           type: string
 *           example: bearer
 */

/**
 * @swagger
 * /auth/citizens/login:
 *   post:
 *     summary: Authenticate a citizen
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequestDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               grant_type:
 *                 type: string
 *                 example: password
 *     security:
 *       - citizenPassword: []
 *     responses:
 *       200:
 *         description: Successfully authenticated citizen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessTokenResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/citizens/login",
  authController.loginCitizen.bind(authController)
);

/**
 * @swagger
 * /auth/internal/login:
 *   post:
 *     summary: Authenticate an internal user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequestDTO'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               grant_type:
 *                 type: string
 *                 example: password
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: Successfully authenticated internal user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessTokenResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/internal/login",
  authController.loginInternal.bind(authController)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current authenticated user
 *     tags: [Auth]
 *     security:
 *       - citizenPassword: []
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized - missing or invalid token
 */
router.post("/logout", requireAuth, authController.logout.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Return the authenticated profile
 *     tags: [Auth]
 *     security:
 *       - citizenPassword: []
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: Profile payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kind:
 *                   type: string
 *                   enum: [citizen, internal]
 *                 profile:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CitizenDTO'
 *                     - $ref: '#/components/schemas/InternalUserDTO'
 *       401:
 *         description: Unauthorized
 */
router.get("/me", requireAuth, authController.me.bind(authController));

export default router;
