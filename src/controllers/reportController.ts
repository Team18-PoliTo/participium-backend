import { Request, Response, NextFunction } from "express";
import {
  CreateReportRequestDTO,
  GetAssignedReportsForMapRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { IReportService } from "../services/IReportService";

class ReportController {
  constructor(private reportService: IReportService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get authenticated citizen ID from JWT token
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
      const report = await this.reportService.create(
        createReportDTO,
        citizenId
      );
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Citizen not found") {
          res.status(404).json({ error: error.message });
          return;
        } else if (error.message.includes("Category not found")) {
          res.status(400).json({ error: error.message });
          return;
        } else {
          res.status(500).json({ error: "Internal Server Error" });
          next(error);
          return;
        }
      }
      res.status(500).json({ error: "Internal Server Error" });
      next(error);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reportId = parseInt(req.params.id, 10);
      if (Number.isNaN(reportId)) {
        res.status(400).json({ error: "Invalid report ID" });
        return;
      }
      const report = await this.reportService.getReportById(reportId);
      res.status(200).json(report);
    } catch (error) {
      if (error instanceof Error && error.message === "Report not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async getAssignedReportsInMap(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const getReportsDTO = plainToClass(
        GetAssignedReportsForMapRequestDTO,
        req.body
      );
      const errors = await validate(getReportsDTO);
      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }
      if (getReportsDTO.corners.length !== 2) {
        res.status(400).json({ error: "Exactly 2 corners are required" });
        return;
      }
      const reports = await this.reportService.getAssignedReportsInMap(
        getReportsDTO.corners
      );
      res.status(200).json(reports);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
}

export default ReportController;
