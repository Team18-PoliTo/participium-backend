import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import CitizenDAO from "./CitizenDAO";

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

  @Column({ nullable: false })
  category: string;

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
}

export default ReportDAO;
