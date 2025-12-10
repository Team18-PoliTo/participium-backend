import { Entity, Column, OneToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import InternalUserDAO from "./InternalUserDAO";
import OfficeDAO from "./OfficeDAO";
import CategoryRoleDAO from "./CategoryRoleDAO";

@Entity("roles")
class RoleDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  role: string; // e.g. "Street Maintenance Operator" (Manutenzione Stradale Operator)

  @ManyToOne(() => OfficeDAO, (office) => office.roles, {
    nullable: true,
  })
  office: OfficeDAO | null;

  @OneToMany(() => InternalUserDAO, (user) => user.role)
  users: InternalUserDAO[];

  @OneToMany(() => CategoryRoleDAO, (categoryRole) => categoryRole.role, {
    cascade: true,
    eager: false,
  })
  categoryRoles: CategoryRoleDAO[];
}

export default RoleDAO;

