import { ExternalMaintainerDTO } from "../models/dto/InternalUserDTO";
import { ReportDTO } from "../models/dto/ReportDTO";
import DelegatedReportDTO from "../models/dto/DelegatedReportDTO";
import {
  CreateReportRequestDTO,
  UpdateReportRequestDTO,
} from "../models/dto/ValidRequestDTOs";

export interface IReportService {
  create(data: CreateReportRequestDTO, citizenId: number): Promise<ReportDTO>;
  getReportsByStatus(status: string): Promise<ReportDTO[]>;
  updateReport(
    reportId: number,
    data: UpdateReportRequestDTO,
    userId: number,
    userRole?: string
  ): Promise<ReportDTO>;
  getReportsByUser(citizenId: number): Promise<ReportDTO[]>;
  getAssignedReportsInMap(corners: object[]): Promise<Partial<ReportDTO>[]>;
  getReportById(reportId: number): Promise<ReportDTO>;
  getReportsForStaff(
    staffId: number,
    statusFilter?: string
  ): Promise<ReportDTO[]>;
  getReportsByOffice(staffId: number): Promise<ReportDTO[]>;
  delegateReport(
    reportId: number,
    userId: number,
    companyId: number
  ): Promise<ExternalMaintainerDTO>;
  getDelegatedReportsByUser(
    delegatedById: number
  ): Promise<DelegatedReportDTO[]>;
  getCommentsByReportId(reportId: number): Promise<any[]>;
  createComment(
    reportId: number,
    userId: number,
    commentText: string
  ): Promise<any>;
}
