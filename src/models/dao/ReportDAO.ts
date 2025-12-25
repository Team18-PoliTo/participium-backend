import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import CitizenDAO from "./CitizenDAO";
import InternalUserDAO from "./InternalUserDAO";
import CategoryDAO from "./CategoryDAO";
import { ReportStatus } from "../../constants/ReportStatus";
import CommentDAO from "./CommentDAO";

@Entity("reports")
class ReportDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ type: "boolean", nullable: false, default: false })
  isAnonymous: boolean;

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

  @OneToMany(() => CommentDAO, (comment) => comment.report, {
    nullable: true,
    cascade: true,
  })
  comments: CommentDAO[];
}

export default ReportDAO;
