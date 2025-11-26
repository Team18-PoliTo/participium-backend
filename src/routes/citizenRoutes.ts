import { Router } from "express";
import CitizenController from "../controllers/citizenController";
import CitizenService from "../services/implementation/citizenService";
import CitizenRepository from "../repositories/implementation/CitizenRepository";

const router = Router();

// Dependency Injection Setup
const citizenRepository = new CitizenRepository();
const citizenService = new CitizenService(citizenRepository);
const citizenController = new CitizenController(citizenService);

// DTOs
/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterCitizenRequestDTO:
 *       type: object
 *       required:
 *         - email
 *         - username
 *         - firstName
 *         - lastName
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 6
 *     CitizenDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, DEACTIVATED]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /citizens/register:
 *   post:
 *     summary: Register a new citizen
 *     tags: [Citizens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCitizenRequestDTO'
 *     responses:
 *       201:
 *         description: Citizen created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CitizenDTO'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Citizen with this email or username already exists
 */
// POST /register - Register a new citizen
router.post("/register", citizenController.register.bind(citizenController));

/**
 * @swagger
 * /citizens/me:
 *   patch:
 *     summary: Update profile of the logged-in citizen
 *     description: Allows the authenticated citizen to update their profile information.
 *     tags: [Citizens]

 *     security:
 *       - citizenPassword: []

 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 nullable: true
 *                 example: "newusername"
 *               firstName:
 *                 type: string
 *                 nullable: true
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 nullable: true
 *                 example: "Doe"
 *               telegramUsername:
 *                 type: string
 *                 nullable: true
 *                 example: "mytelegram"
 *               emailNotificationsEnabled:
 *                 type: boolean
 *                 example: true
 *               accountPhoto:
 *                 type: string
 *                 nullable: true
 *                 example: "temp/1b4b98e7/photo.png"
 *                 description: Temporary file path returned from /files/upload

 *     responses:
 *       200:
 *         description: Citizen profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Citizen not found
 */
router.patch(
    "/me",
    citizenController.updateMyProfile.bind(citizenController)
);

export default router;
