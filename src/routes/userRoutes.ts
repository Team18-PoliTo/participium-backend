import { Router } from "express";
import UserController from "../controllers/userController";
import UserService from "../services/implementation/userService";
import UserRepository from "../repositories/implementation/UserRepository";

const router = Router();

// Dependency Injection Setup
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// DTOs
/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequestDTO:
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
 *     UserDTO:
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
 *         role:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new citizen user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequestDTO'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User with this email or username already exists
 */
// POST /register - Register a new user
router.post("/register", userController.register.bind(userController));

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequestDTO'
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserDTO'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
// POST /login - Authenticate user
router.post("/login", userController.login.bind(userController));

export default router;
