import { Request, Response, NextFunction } from "express";
import { CreateReportRequestDTO } from "../models/dto/ValidRequestDTOs";
import { ReportDTO } from "../models/dto/ReportDTO";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

interface IReportService {
  create(data: CreateReportRequestDTO): Promise<ReportDTO>;
}

class ReportController {
  constructor(private reportService: IReportService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createReportDTO = plainToClass(CreateReportRequestDTO, req.body);
      const errors = await validate(createReportDTO);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }
      const report = await this.reportService.create(createReportDTO);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export default ReportController;
