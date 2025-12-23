import {
  Entity,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import ReportDAO from "./ReportDAO";
import InternalUserDAO from "./InternalUserDAO";

@Entity("delegated_reports")
class DelegatedReportDAO {
  @PrimaryColumn({ type: "integer" })
  @ManyToOne(() => ReportDAO, { eager: true })
  @JoinColumn({ name: "reportId" })
  report: ReportDAO;

  @ManyToOne(() => InternalUserDAO, { nullable: false, eager: true })
  @JoinColumn({ name: "delegatedById" })
  delegatedBy: InternalUserDAO;

  @CreateDateColumn({ type: "datetime" })
  delegatedAt: Date;
}

export default DelegatedReportDAO;
