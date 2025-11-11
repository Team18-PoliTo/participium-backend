import { Request, Response, NextFunction } from "express";
import { RegisterCitizenRequestDTO } from "../models/dto/ValidRequestDTOs";
import { ICitizenService } from "../services/ICitizenService";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

class CitizenController {
  constructor(private citizenService: ICitizenService) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = plainToInstance(RegisterCitizenRequestDTO, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length) {
        const msg = errors
          .map((e) => Object.values(e.constraints ?? {}))
          .flat()
          .join("; ");
        res.status(400).json({ error: msg });
        return;
      }

      const citizen = await this.citizenService.register(dto);
      res.status(201).json(citizen);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message === "Citizen with this email already exists" ||
          err.message === "Citizen with this username already exists")
      ) {
        res.status(409).json({ error: err.message });
        return;
      }
      next(err);
    }
  }
}

export default CitizenController;
