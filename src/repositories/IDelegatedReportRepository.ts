import DelegatedReportDAO from "../models/dao/DelegatedReportDAO";

export interface IDelegatedReportRepository {
  create(reportId: number, delegatedById: number): Promise<DelegatedReportDAO>;
  deleteByReportId(reportId: number): Promise<void>;
  findByReportId(reportId: number): Promise<DelegatedReportDAO | null>;
  findReportsByDelegatedBy(
    delegatedById: number
  ): Promise<DelegatedReportDAO[]>;
}
