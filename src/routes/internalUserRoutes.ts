import { Router } from "express";
import InternalUserController from "../controllers/InternalUserController";
import InternalUserService from "../services/internalUserService";
import InternalUserRepository from "../repositories/InternalUserRepository";
import RoleRepository from "../repositories/RoleRepository";
import RoleService from "../services/RoleService";
import RoleController from "../controllers/RoleController";

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const internalUserController = new InternalUserController(internalUserService);


const roleRepository = new RoleRepository();
const roleService = new RoleService(roleRepository);
const roleController = new RoleController(roleService);

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
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /admin/employees:
 *   get:
 *     summary: Fetch all internal users
 *     description: Retrieves all internal users from the database.
 *     tags: [Internal Users]
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
//GET /users - GET all internalUsers
router.get("/employees", internalUserController.fetch.bind(internalUserController));

/**
 * @swagger
 * /admin/addEmployee:
 *   post:
 *     summary: Add a new internal user
 *     tags: [Internal Users]
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
// POST /register - Register a new internalUser
router.post(
  "/addEmployee",
  internalUserController.create.bind(internalUserController)
);

/**
 * @swagger
 * /admin/updateEmployee/{id}:
 *   put:
 *     summary: Update an internal user
 *     tags: [Internal Users]
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
// PUT /updateEmployee/:id
router.put(
  "/updateEmployee/:id",
  internalUserController.update.bind(internalUserController)
);

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Fetch all roles
 *     description: Retrieves a list of all available roles in the system.
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoleDTO'
 *       400:
 *         description: Failed to retrieve roles
 */
//GET /role - GET all roles
router.get('/roles', roleController.getAll.bind(roleController));

export default router;
