import { Router } from "express";
import InternalUserController from "../controllers/InternalUserController";
import InternalUserService from "../services/internalUserService";
import InternalUserRepository from "../repositories/InternalUserRepository";

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const internalUserController = new InternalUserController(internalUserService);

// DTOs
/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterInternalUserRequestDTO:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *         - password
 *       properties:
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 6
 *         roleId:
 *           type: integer
 *           description: Optional role identifier (defaults to 0)
 *     InternalUserDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         role:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, DEACTIVATED]
 */

/**
 * @swagger
 * /admin/internal-users:
 *   get:
 *     summary: Fetch all internal users
 *     description: Retrieves all internal users from the database.
 *     tags: [Admin]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: List of internal users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InternalUserDTO'
 *       400:
 *         description: Failed to retrieve internal users
 */
router.get("/", internalUserController.fetch.bind(internalUserController));

/**
 * @swagger
 * /admin/internal-users:
 *   post:
 *     summary: Add a new internal user
 *     tags: [Admin]
 *     security:
 *       - internalPassword: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInternalUserRequestDTO'
 *     responses:
 *       201:
 *         description: Internal user created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalUserDTO'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post("/", internalUserController.create.bind(internalUserController));

/**
 * @swagger
 * /admin/internal-users/{id}:
 *   put:
 *     summary: Update an internal user
 *     tags: [Admin]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Internal user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newEmail:
 *                 type: string
 *               newFirstName:
 *                 type: string
 *               newLastName:
 *                 type: string
 *               newRoleId:
 *                 type: integer
 *                 description: Optional new role identifier
 *     responses:
 *       200:
 *         description: Internal user updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalUserDTO'
 *       400:
 *         description: Invalid ID or validation error
 *       409:
 *         description: Email already in use
 */
router.put("/:id", internalUserController.update.bind(internalUserController));

/**
 * @swagger
 * /admin/internal-users/{id}:
 *   delete:
 *     summary: Disable an internal user
 *     tags: [Admin]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Internal user ID
 *     responses:
 *       204:
 *         description: Internal user disabled successfully
 *       400:
 *         description: Invalid ID
 *       403:
 *         description: Attempted to delete own account
 *       404:
 *         description: Internal user not found
 */
router.delete("/:id", internalUserController.delete.bind(internalUserController));

export default router;

