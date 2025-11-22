import { Request, Response, NextFunction } from "express";
import { CreateReportRequestDTO } from "../models/dto/ValidRequestDTOs";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { IReportService } from "../services/IReportService";

class ReportController {
  constructor(private reportService: IReportService) {}
  private handleError(error: any, res: Response, next: NextFunction): void {
    if (error instanceof Error) {
      if (error.message === "Citizen not found") {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error.message.includes("Category not found")) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Internal Server Error" });
      next(error);
      return;
    }

    res.status(500).json({ error: "Internal Server Error" });
    next(error);
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = (req as any).auth?.sub;
      if (!citizenId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const createReportDTO = plainToClass(CreateReportRequestDTO, req.body);
      const errors = await validate(createReportDTO);

      if (errors.length > 0) {
        const errorMessages = errors
            .map((err) => Object.values(err.constraints || {}).join(", "))
            .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }

      const report = await this.reportService.create(createReportDTO, citizenId);
      res.status(201).json(report);

    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getMyReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = (req as any).auth?.sub;
      if (!citizenId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const reports = await this.reportService.getReportsByUser(citizenId);
      res.status(200).json(reports);

    } catch (error) {
      this.handleError(error, res, next);
    }
  }
}

export default ReportController;

