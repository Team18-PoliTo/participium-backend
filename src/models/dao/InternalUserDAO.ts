import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, DeleteDateColumn} from "typeorm";
import RoleDAO from "./RoleDAO";

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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RoleDAO, (role) => role.users, { nullable: false })
  role: RoleDAO;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deletedAt: Date | null;
}

export default InternalUserDAO;

