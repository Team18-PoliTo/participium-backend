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
  @PrimaryColumn({ name: "reportId", type: "integer" })
  reportId: number;

  // When a report is deleted (e.g. force seeding), delegated rows must be removed too.
  @ManyToOne(() => ReportDAO, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "reportId" })
  report: ReportDAO;

  @ManyToOne(() => InternalUserDAO, { nullable: false, eager: true })
  @JoinColumn({ name: "delegatedById" })
  delegatedBy: InternalUserDAO;

  @CreateDateColumn({ type: "datetime" })
  delegatedAt: Date;
}

export default DelegatedReportDAO;
