import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  JoinColumn,
} from "typeorm";
import InternalUserDAO from "./InternalUserDAO";
import RoleDAO from "./RoleDAO";

@Entity({ name: "internal_user_roles" })
@Unique(["internalUser", "role"])
class InternalUserRoleDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ type: "integer", nullable: false })
  internalUserId: number;

  @ManyToOne(() => InternalUserDAO, (user) => user.roles, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "internalUserId" })
  internalUser: InternalUserDAO;

  @Column({ type: "integer", nullable: false })
  roleId: number;

  @ManyToOne(() => RoleDAO, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "roleId" })
  role: RoleDAO;
}

export default InternalUserRoleDAO;
