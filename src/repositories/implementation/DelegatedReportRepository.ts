import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import DelegatedReportDAO from "../../models/dao/DelegatedReportDAO";
import ReportDAO from "../../models/dao/ReportDAO";
import InternalUserDAO from "../../models/dao/InternalUserDAO";
import { IDelegatedReportRepository } from "../IDelegatedReportRepository";

export class DelegatedReportRepository implements IDelegatedReportRepository {
  private readonly repo: Repository<DelegatedReportDAO>;
  private readonly reportRepo: Repository<ReportDAO>;
  private readonly internalUserRepo: Repository<InternalUserDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(DelegatedReportDAO);
    this.reportRepo = AppDataSource.getRepository(ReportDAO);
    this.internalUserRepo = AppDataSource.getRepository(InternalUserDAO);
  }

  async create(
    reportId: number,
    delegatedById: number
  ): Promise<DelegatedReportDAO> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new Error(`Report with id ${reportId} not found`);
    }

    const delegatedBy = await this.internalUserRepo.findOne({
      where: { id: delegatedById },
    });
    if (!delegatedBy) {
      throw new Error(`Internal user with id ${delegatedById} not found`);
    }

    const delegatedReport = this.repo.create({
      report,
      delegatedBy,
    });
    return await this.repo.save(delegatedReport);
  }

  async deleteByReportId(reportId: number): Promise<void> {
    await this.repo.delete({ report: { id: reportId } });
  }

  async findByReportId(reportId: number): Promise<DelegatedReportDAO | null> {
    return await this.repo.findOne({
      where: { report: { id: reportId } },
    });
  }

  async findReportsByDelegatedBy(
    delegatedById: number
  ): Promise<DelegatedReportDAO[]> {
    return await this.repo
      .createQueryBuilder("delegated")
      .leftJoinAndSelect("delegated.report", "report")
      .leftJoinAndSelect("report.category", "category")
      .leftJoinAndSelect("report.citizen", "citizen")
      .leftJoinAndSelect("report.assignedTo", "assignedTo")
      .leftJoin("delegated.delegatedBy", "user")
      .where("user.id = :delegatedById", { delegatedById })
      .orderBy("delegated.delegatedAt", "DESC")
      .getMany();
  }
}

export default DelegatedReportRepository;
