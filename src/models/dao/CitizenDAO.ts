import { on } from "events";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import ReportDAO from "./ReportDAO";

export type CitizenStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

@Entity("users")
class CitizenDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ nullable: false, select: false })
  password: string;

  @Column({ type: "varchar", default: () => "'ACTIVE'", nullable: true })
  status: CitizenStatus;

  @Column({ type: "int", default: 0 })
  failedLoginAttempts: number;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: "datetime" })
  createdAt: Date;

  @OneToMany(() => ReportDAO, (report) => report.citizen, { nullable: true, onDelete: "CASCADE" })
  reports: ReportDAO[];
}

export default CitizenDAO;

