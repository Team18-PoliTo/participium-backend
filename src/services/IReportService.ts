import { ReportDTO } from "../models/dto/ReportDTO";
import { CreateReportRequestDTO } from "../models/dto/ValidRequestDTOs";

export interface IReportService {
  create(data: CreateReportRequestDTO, citizenId: number): Promise<ReportDTO>;
  getReportsByStatus(status: string): Promise<ReportDTO[]>;
}

