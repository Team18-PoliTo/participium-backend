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
}

class InternalUserController {
  constructor(private internalUserService: IInternalUserService) {}

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
}

export default InternalUserController;
