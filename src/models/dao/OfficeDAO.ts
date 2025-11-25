import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import RoleDAO from "./RoleDAO";

@Entity("offices")
class OfficeDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  name: string; // e.g. "Street Maintenance Office" (Ufficio Manutenzione Stradale)

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => RoleDAO, (role) => role.office, {
    cascade: true,
    eager: false,
  })
  roles: RoleDAO[];
}

export default OfficeDAO;

