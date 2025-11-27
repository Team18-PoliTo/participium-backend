import { ReportDTO } from "../models/dto/ReportDTO";
import { CreateReportRequestDTO, UpdateReportRequestDTO } from "../models/dto/ValidRequestDTOs";

export interface IReportService {
  create(data: CreateReportRequestDTO, citizenId: number): Promise<ReportDTO>;
  getReportsByStatus(status: string): Promise<ReportDTO[]>;
  updateReport(reportId: number, data: UpdateReportRequestDTO, userRole?: string): Promise<ReportDTO>;
  getReportsByUser(citizenId:number): Promise<ReportDTO[]>;
  getAssignedReportsInMap(corners: Object[]): Promise<Partial<ReportDTO>[]>;
  getReportById(reportId: number): Promise<ReportDTO>;
  getReportsForStaff(staffId: number): Promise<ReportDTO[]>;
  getReportsByOffice(staffId: number): Promise<ReportDTO[]>;
}

