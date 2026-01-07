import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import CompanyDAO from "./CompanyDAO";
import CommentDAO from "./CommentDAO";
import InternalUserRoleDAO from "./InternalUserRoleDAO";

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

  @Column({ default: () => 0, nullable: false })
  activeTasks: number;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * One internal user can have multiple roles
   */
  @OneToMany(() => InternalUserRoleDAO, (ur) => ur.internalUser, {
    cascade: ["insert", "update", "remove"],
    eager: true,
  })
  roles: InternalUserRoleDAO[];

  @ManyToOne(() => CompanyDAO, (company) => company.internalUsers, {
    nullable: true,
  })
  company: CompanyDAO | null;

  @ManyToOne(() => CommentDAO, (comment) => comment.comment_owner, {
    nullable: true,
  })
  comments: CommentDAO[];
}

export default InternalUserDAO;
