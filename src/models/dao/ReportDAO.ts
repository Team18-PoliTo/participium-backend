import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import CitizenDAO from "./CitizenDAO";

export type ReportStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

//title, description,  category , photos (min 1 max 3).

@Entity("Report")
class ReportDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @ManyToOne(() => CitizenDAO, (citizen) => citizen.reports, { nullable: false })
  citizen: CitizenDAO;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  description: string;

  @Column({ nullable: false })
  category: string;

  @Column({ nullable: false })
  photo1: string;

  @Column({ nullable: true })
  photo2: string;

  @Column({ nullable: true })
  photo3: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({nullable: false})
  location: string;
}

export default ReportDAO;
