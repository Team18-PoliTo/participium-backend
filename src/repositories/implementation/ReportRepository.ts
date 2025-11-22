import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import ReportDAO from "../../models/dao/ReportDAO";
import { IReportRepository } from "../IReportRepository";

export class ReportRepository implements IReportRepository {
  private repo: Repository<ReportDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(ReportDAO);
  }

  async create(reportDAO: ReportDAO): Promise<ReportDAO> {
    const report = this.repo.create(reportDAO);
    return await this.repo.save(report);
  }
  async findById(id: number): Promise<ReportDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["citizen", "category", "assignedTo"],
    });
  }

  // update to add photos paths
  async update(reportDAO: Partial<ReportDAO>): Promise<ReportDAO> {
    return await this.repo.save(reportDAO);
  }

  async findByStatus(status: string): Promise<ReportDAO[]> {
    return await this.repo.find({
      where: { status },
      relations: ["citizen"],
      order: { createdAt: "DESC" },
    });
  }

  async findAll(): Promise<ReportDAO[]> {
    return await this.repo.find({
      relations: ["citizen", "explanation"],
      order: { createdAt: "DESC" },
    });
  }

  async updateStatus(
    id: number,
    status: string,
    explanation?: string,
    assignedTo?: any
  ): Promise<ReportDAO> {
    await this.repo.update(id, { status, explanation, assignedTo });
    return (await this.findById(id)) as ReportDAO;
  }

  async findByUser(citizenId: number): Promise<ReportDAO[]> {
    return this.repo.find({
      where: {
        citizen: { id: citizenId },
      },
    });
  }
  async findByAssignedStaff(staffId: number): Promise<ReportDAO[]> {
    return this.repo.find({
      where: {
        assignedTo: { id: staffId },
      },
      relations: ["assignedTo", "category"],
      order: { createdAt: "DESC" },
    });
  }
}
