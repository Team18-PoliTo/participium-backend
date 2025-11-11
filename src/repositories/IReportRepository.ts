import { ReportDTO } from "../models/dto/ReportDTO";
import ReportDAO from "../models/dao/ReportDAO";

export interface IReportRepository {
  create(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
  findById(id: number): Promise<ReportDAO | null>;
  update(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
}
