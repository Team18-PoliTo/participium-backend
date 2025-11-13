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

export default router;
