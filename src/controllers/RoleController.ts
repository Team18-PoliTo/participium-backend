import { Request, Response, NextFunction } from "express";
import RoleService from "../services/RoleService";

/**
 * Controller for handling internal user roles.
 */
class RoleController {
  constructor(private roleService: RoleService) {}

  /**
   * @swagger
   * /admin/roles:
   *   get:
   *     summary: Fetch all user roles
   *     description: Retrieves all available internal user roles in the system.
   *     tags: [Roles]
   *     responses:
   *       200:
   *         description: List of available roles
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     example: 1
   *                   name:
   *                     type: string
   *                     example: "Admin"
   *       400:
   *         description: Could not fetch roles
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await this.roleService.getAllRoles();
      res.status(200).json(roles);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export default RoleController;
