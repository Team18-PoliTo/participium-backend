import { Request, Response, NextFunction } from "express";
import { RegisterInternalUserRequestDTO } from "../models/dto/RegisterInternalUserRequestDTO";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

interface IInternalUserService {
  register(
    data: RegisterInternalUserRequestDTO
  ): Promise<InternalUserDTO>;
}

class InternalUserController {
  constructor(private internalUserService: IInternalUserService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Transform and validate request body
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

      // Register internalUser
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
}

export default InternalUserController;
