import { Request, Response, NextFunction } from "express";
import { RegisterRequestDTO } from "../models/dto/RegisterRequestDTO";
import { UserDTO } from "../models/dto/UserDTO";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

interface IUserService {
  register(registerData: RegisterRequestDTO): Promise<UserDTO>;
}

class UserController {
  constructor(private userService: IUserService) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Transform and validate request body
      const registerDTO = plainToClass(RegisterRequestDTO, req.body);
      const errors = await validate(registerDTO);

      if (errors.length > 0) {
        const errorMessages = errors.map(err => 
          Object.values(err.constraints || {}).join(', ')
        ).join('; ');
        res.status(400).json({ error: errorMessages });
        return;
      }

      // Register user
      const user = await this.userService.register(registerDTO);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "User with this email already exists" || 
           error.message === "User with this username already exists")) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export default UserController;

