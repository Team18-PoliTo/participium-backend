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

  async updateCitizen(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid citizen ID" });
      }

      // accountPhoto теперь НЕ файл, а строка
      const {
        email,
        username,
        firstName,
        lastName,
        telegramUsername,
        emailNotificationsEnabled,
        accountPhoto, // ← получаем строку из body
      } = req.body;

      const updated = await this.citizenService.updateCitizen(id, {
        email: email ?? undefined,
        username: username ?? undefined,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        telegramUsername: telegramUsername ?? undefined,
        emailNotificationsEnabled:
            emailNotificationsEnabled !== undefined
                ? emailNotificationsEnabled === "true" ||
                emailNotificationsEnabled === true
                : undefined,
        photoPath: accountPhoto ?? undefined,
      });

      return res.status(200).json(updated);

    } catch (err: any) {
      if (err instanceof Error && err.message === "Citizen not found") {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof Error && err.message.startsWith("Invalid")) {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }
  }
}

export default CitizenController;
