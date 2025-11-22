import { ReportDTO } from "../models/dto/ReportDTO";
import ReportDAO from "../models/dao/ReportDAO";

export interface IReportRepository {
  create(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
  findById(id: number): Promise<ReportDAO | null>;
  update(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
  findByStatus(status: string): Promise<ReportDAO[]>;
  findAll(): Promise<ReportDAO[]>;
  updateStatus(id: number, status: string, explanation?: string, assignedTo?: any): Promise<ReportDAO>;
  findByUser(citizenId: number): Promise<ReportDAO[]>;

}
