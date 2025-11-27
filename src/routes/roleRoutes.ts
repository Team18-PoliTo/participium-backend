import { Router } from "express";
import RoleController from "../controllers/roleController";
import RoleService from "../services/RoleService";
import RoleRepository from "../repositories/implementation/RoleRepository";

const router = Router();

const roleRepository = new RoleRepository();
const roleService = new RoleService(roleRepository);
const roleController = new RoleController(roleService);

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Fetch all internal user roles
 *     tags: [Admin]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   role:
 *                     type: string
 *       400:
 *         description: Could not fetch roles
 */
router.get("/", roleController.getAll.bind(roleController));

export default router;
