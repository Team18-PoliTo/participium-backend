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
import { ValidationError } from "@nestjs/common";

class AuthController {
  constructor(
      private readonly citizenService: ICitizenService,
      private readonly internalUserService: InternalUserService,
      private readonly citizenRepository: CitizenRepository = new CitizenRepository(),
      private readonly internalRepository: InternalUserRepository = new InternalUserRepository()
  ) {}

  /**
   * Shared login handler for both citizen and internal users.
   */
  private async handleLogin(
      req: Request,
      res: Response,
      next: NextFunction,
      loginFn: (dto: LoginRequestDTO) => Promise<any>
  ): Promise<void> {
    try {
      const normalized = {
        ...req.body,
        email: req.body?.email ?? req.body?.username,
      };

      const dto = plainToInstance(LoginRequestDTO, {
        email: normalized.email,
        password: normalized.password,
      });

      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

      if (errors.length > 0) {
        const message = errors
            .flatMap((e: ValidationError) => Object.values(e.constraints ?? {}))
            .join("; ");
        res.status(400).json({ error: message });
        return;
      }

      const result = await loginFn(dto);
      res.status(200).json(result);

    } catch (err) {
      if (err instanceof Error && err.message === "Invalid credentials") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      next(err);
    }
  }

  /** Citizen login */
  async loginCitizen(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.handleLogin(req, res, next, dto =>
        this.citizenService.login(dto)
    );
  }

  /** Internal user login */
  async loginInternal(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.handleLogin(req, res, next, dto =>
        this.internalUserService.login(dto)
    );
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
        res.status(200).json({
          kind: "citizen",
          profile: await CitizenMapper.toDTO(citizen),
        });
        return;
      }

      if (req.auth.kind === "internal") {
        const internal = await this.internalRepository.findById(req.auth.sub);
        if (!internal) {
          res.status(404).json({ error: "Internal user not found" });
          return;
        }
        res.status(200).json({
          kind: "internal",
          profile: InternalUserMapper.toDTO(internal),
        });
        return;
      }

      res.status(400).json({ error: "Unknown authentication kind" });

    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;

