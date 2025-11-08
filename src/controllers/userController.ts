import { Request, Response, NextFunction } from "express";
import { RegisterRequestDTO } from "../models/dto/ValidRequestDTOs";
import { IUserService } from "../services/IUserService";
import { validate } from "class-validator";
import { plainToInstance} from "class-transformer";
import {LoginRequestDTO} from "../models/dto/LoginRequestDTO";


class UserController {
  constructor(private userService: IUserService) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = plainToInstance(RegisterRequestDTO, req.body);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      if (errors.length) {
        const msg = errors.map(e => Object.values(e.constraints ?? {})).flat().join("; ");
        res.status(400).json({ error: msg });
        return;
      }

      const user = await this.userService.register(dto);
      res.status(201).json(user);
    } catch (err: any) {
      if (err instanceof Error && (
          err.message === "User with this email already exists" ||
          err.message === "User with this username already exists")) {
        res.status(409).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = plainToInstance(LoginRequestDTO, req.body);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      if (errors.length) {
        const msg = errors.map(e => Object.values(e.constraints ?? {})).flat().join("; ");
        res.status(400).json({ error: msg });
        return;
      }

      const result = await this.userService.login(dto);
      res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof Error && err.message === "Invalid credentials") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
      }

      if (req.auth && req.auth.sub === id) {
        res.status(400).json({ message: 'You cannot delete your own account' });
        return;
      }

      const result = await this.userService.disableUserById(id);
      if (result === 'not_found') {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
