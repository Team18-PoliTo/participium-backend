import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
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
    eager: true,
  })
  @JoinColumn({ name: "citizenId" })
  citizen: CitizenDAO;

  @Column({ nullable: false })
  citizenId: number;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  description: string;

  @ManyToOne(() => CategoryDAO, {
    nullable: false,
    eager: true,
  })
  category: CategoryDAO;

  @Column({ nullable: true })
  photo1: string;

  @Column({ nullable: true })
  photo2: string;

  @Column({ nullable: true })
  photo3: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: false })
  location: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address: string | null;

  @Column({ nullable: false, default: ReportStatus.PENDING_APPROVAL })
  status: string;

  @Column({ type: "text", nullable: true })
  explanation: string | null;

  @ManyToOne(() => InternalUserDAO, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: "assignedToId" })
  assignedTo: InternalUserDAO | null;

  @Column({ nullable: true })
  assignedToId: number | null;
}

export default ReportDAO;
