/* istanbul ignore file */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import CitizenDAO from "./CitizenDAO";
import InternalUserDAO from "./InternalUserDAO";
import CategoryDAO from "./CategoryDAO";
import { ReportStatus } from "../../constants/ReportStatus";

@Entity("reports")
class ReportDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @ManyToOne(() => CitizenDAO, (citizen) => citizen.reports, {
    nullable: false,
  })
  citizen: CitizenDAO;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  description: string;

  @ManyToOne(() => CategoryDAO, {
    nullable: false,
    eager: true,
  })
  category: CategoryDAO;

  // minIO ObjecKey
  @Column({ nullable: true })
  photo1: string;

  // minIO ObjecKey
  @Column({ nullable: true })
  photo2: string;

  // minIO ObjecKey
  @Column({ nullable: true })
  photo3: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: false })
  location: string;

  @Column({ nullable: false, default: ReportStatus.PENDING_APPROVAL })
  status: string;

  @Column({ type: "text", nullable: true })
  explanation: string | null;

  @ManyToOne(() => InternalUserDAO, {
    nullable: true,
  })
  assignedTo: InternalUserDAO | null;
}

export default ReportDAO;
