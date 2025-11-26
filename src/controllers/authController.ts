import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";
import { ICitizenService } from "../services/ICitizenService";
import InternalUserService from "../services/internalUserService";
import CitizenRepository from "../repositories/implementation/CitizenRepository";
import InternalUserRepository from "../repositories/InternalUserRepository";
import { CitizenMapper } from "../mappers/CitizenMapper";
import { InternalUserMapper } from "../mappers/InternalUserMapper";

class AuthController {
  constructor(
    private citizenService: ICitizenService,
    private internalUserService: InternalUserService,
    private citizenRepository: CitizenRepository = new CitizenRepository(),
    private internalRepository: InternalUserRepository = new InternalUserRepository()
  ) {}

  async loginCitizen(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const normalizedBody = {
        ...req.body,
        email: req.body?.email ?? req.body?.username,
      };
      const sanitizedBody = {
        email: normalizedBody.email,
        password: normalizedBody.password,
      };
      const dto = plainToInstance(LoginRequestDTO, sanitizedBody);
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

      const result = await this.citizenService.login(dto);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid credentials") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      next(err);
    }
  }

  async loginInternal(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const normalizedBody = {
        ...req.body,
        email: req.body?.email ?? req.body?.username,
      };
      const sanitizedBody = {
        email: normalizedBody.email,
        password: normalizedBody.password,
      };
      const dto = plainToInstance(LoginRequestDTO, sanitizedBody);
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

      const result = await this.internalUserService.login(dto);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid credentials") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      next(err);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: "Logged out successfully" });
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (req.auth.kind === "citizen") {
        const citizen = await this.citizenRepository.findByEmail(req.auth.email ?? "");
        if (!citizen) {
          res.status(404).json({ error: "Citizen not found" });
          return;
        }
        res.status(200).json({ kind: "citizen", profile: await CitizenMapper.toDTO(citizen) });
        return;
      }

      if (req.auth.kind === "internal") {
        const internal = await this.internalRepository.findById(req.auth.sub);
        if (!internal) {
          res.status(404).json({ error: "Internal user not found" });
          return;
        }
        res.status(200).json({ kind: "internal", profile: InternalUserMapper.toDTO(internal) });
        return;
      }

      res.status(400).json({ error: "Unknown authentication kind" });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
