import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import OfficeDAO from "./OfficeDAO";
import InternalUserRoleDAO from "./InternalUserRoleDAO";
import CategoryRoleDAO from "./CategoryRoleDAO";

@Entity("roles")
class RoleDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  role: string;

  @ManyToOne(() => OfficeDAO, (office) => office.roles, {
    nullable: true,
  })
  office: OfficeDAO | null;

  @OneToMany(() => InternalUserRoleDAO, (ur) => ur.role)
  userRoles: InternalUserRoleDAO[];

  @OneToMany(() => CategoryRoleDAO, (categoryRole) => categoryRole.role, {
    cascade: true,
    eager: false,
  })
  categoryRoles: CategoryRoleDAO[];
}

export default RoleDAO;
