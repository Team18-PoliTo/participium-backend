import ReportDAO from "../models/dao/ReportDAO";
import CommentDAO from "../models/dao/CommentDAO";

export interface IReportRepository {
  create(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
  findById(id: number): Promise<ReportDAO | null>;
  update(reportDAO: Partial<ReportDAO>): Promise<ReportDAO>;
  findByStatus(status: string): Promise<ReportDAO[]>;
  findAll(): Promise<ReportDAO[]>;
  updateReport(
    id: number,
    updates: {
      status?: string;
      explanation?: string;
      assignedTo?: any;
      categoryId?: number;
    }
  ): Promise<ReportDAO>;
  updateStatus(
    id: number,
    status: string,
    explanation?: string,
    assignedTo?: any
  ): Promise<ReportDAO>;
  findAllApproved(): Promise<ReportDAO[]>;
  findByUser(citizenId: number): Promise<ReportDAO[]>;
  findByAssignedStaff(staffId: number): Promise<ReportDAO[]>;
  findByCategoryIds(categoryIds: number[]): Promise<ReportDAO[]>;
  findCommentsByReportId(reportId: number): Promise<CommentDAO[]>;
  createComment(
    reportId: number,
    userId: number,
    commentText: string
  ): Promise<CommentDAO>;
}
