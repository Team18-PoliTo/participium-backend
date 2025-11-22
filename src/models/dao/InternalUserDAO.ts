import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import RoleDAO from "./RoleDAO";

export type InternalUserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

@Entity("internal-users")
class InternalUserDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ nullable: false })
  password: string;

  @Column({ type: "varchar", default: () => "'ACTIVE'", nullable: true })
  status: InternalUserStatus;

  @Column({ default: () => 0, nullable: false})
  activeTasks: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RoleDAO, (role) => role.users, { nullable: false })
  role: RoleDAO;

}

export default InternalUserDAO;

