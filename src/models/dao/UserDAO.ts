import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn} from "typeorm";

export type UserRole = "CITIZEN";

@Entity("users")
class UserDAO {
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

  @Column({ type: "varchar", default: "CITIZEN" })
  role: UserRole;

  @Column({ type: "int", default: 0 })
  failedLoginAttempts: number;

  @Column({ type: "datetime", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: "datetime" })
  createdAt: Date;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deletedAt: Date | null;
}

export default UserDAO;

