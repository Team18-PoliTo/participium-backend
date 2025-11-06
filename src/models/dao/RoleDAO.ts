import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import InternalUserDAO from "./InternalUserDAO";

@Entity("roles")
class RoleDAO {
  @PrimaryColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  role: string;

  @OneToMany(() => InternalUserDAO, (user) => user.role)
  users: InternalUserDAO[];
}

export default RoleDAO;

