import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import CategoryRoleDAO from "./CategoryRoleDAO";

@Entity("categories")
class CategoryDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  name: string; // e.g. "Water Supply – Drinking Water" (Fornitura di Acqua - Acqua Potabile)

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => CategoryRoleDAO, (categoryRole) => categoryRole.category, {
    cascade: true,
    eager: false,
  })
  categoryRoles: CategoryRoleDAO[];
}

export default CategoryDAO;

