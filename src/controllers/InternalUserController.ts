import { Request, Response, NextFunction } from "express";
import {
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

interface IInternalUserService {
  register(data: RegisterInternalUserRequestDTO): Promise<InternalUserDTO>;
  update(
    id: number,
    data: UpdateInternalUserRequestDTO
  ): Promise<InternalUserDTO>;
  fetchUsers(): Promise<InternalUserDTO[]>;
  disableById(id: number): Promise<'ok' | 'not_found'>;
}

class InternalUserController {
  constructor(private internalUserService: IInternalUserService) {}

  /**
   * @swagger
   * /admin/addEmployee:
   *   post:
   *     summary: Register a new internal user
   *     description: Creates a new internal user after validating the request body.
   *     tags: [Internal Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterInternalUserRequestDTO'
   *     responses:
   *       201:
   *         description: Internal user successfully created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InternalUserDTO'
   *       400:
   *         description: Validation error in request body
   *       409:
   *         description: Email already exists
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registerDTO = plainToClass(
        RegisterInternalUserRequestDTO,
        req.body
      );
      const errors = await validate(registerDTO);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }

      const internalUser = await this.internalUserService.register(registerDTO);
      res.status(201).json(internalUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "InternalUser with this email already exists"
      ) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * @swagger
   * /admin/updateEmployee/{id}:
   *   put:
   *     summary: Update an internal user
   *     description: Updates internal user information by ID.
   *     tags: [Internal Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the internal user to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateInternalUserRequestDTO'
   *     responses:
   *       200:
   *         description: Internal user updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InternalUserDTO'
   *       400:
   *         description: Invalid ID or validation error
   *       409:
   *         description: Email already in use
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID format" });
        return;
      }

      const internalUserData: UpdateInternalUserRequestDTO = req.body;
      const updatedUser = await this.internalUserService.update(
        id,
        internalUserData
      );
      res.status(200).json(updatedUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "InternalUser with this email already exists"
      ) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

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
  async fetch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.internalUserService.fetchUsers();
      res.status(200).json(users);
    } catch (error) {
      if (
        error instanceof Error        
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 0) {
        res.status(400).json({ message: 'Invalid internal user id' });
        return;
      }

      // Если у тебя в req.auth.sub лежит id текущего internal user — можно защититься от самоудаления:
      if ((req as any).auth?.sub && Number((req as any).auth.sub) === id) {
        res.status(403).json({ message: 'You cannot delete your own account' });
        return;
      }

      const result = await this.internalUserService.disableById(id);
      if (result === 'not_found') {
        res.status(404).json({ message: 'Internal user not found' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export default InternalUserController;
