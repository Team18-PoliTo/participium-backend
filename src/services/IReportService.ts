import { ExternalMaintainerDTO } from "../models/dto/InternalUserDTO";
import { ReportDTO } from "../models/dto/ReportDTO";
import { CreateReportRequestDTO, UpdateReportRequestDTO } from "../models/dto/ValidRequestDTOs";

export interface IReportService {
  create(data: CreateReportRequestDTO, citizenId: number): Promise<ReportDTO>;
  getReportsByStatus(status: string): Promise<ReportDTO[]>;
  updateReport(reportId: number, data: UpdateReportRequestDTO, userId: number, userRole?: string): Promise<ReportDTO>;
  getReportsByUser(citizenId:number): Promise<ReportDTO[]>;
  getAssignedReportsInMap(corners: Object[]): Promise<Partial<ReportDTO>[]>;
  getReportById(reportId: number): Promise<ReportDTO>;
  getReportsForStaff(staffId: number, statusFilter?: string): Promise<ReportDTO[]>;
  getReportsByOffice(staffId: number): Promise<ReportDTO[]>;
  delegateReport(reportId: number, userId: number, companyId: number): Promise<ExternalMaintainerDTO>;
}

