import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import CategoryRoleDAO from "./CategoryRoleDAO";
import CompanyCategoryDAO from "./CompanyCategoryDAO";

@Entity("categories")
class CategoryDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => CategoryRoleDAO, (categoryRole) => categoryRole.category, {
    cascade: true,
    eager: false,
  })
  categoryRoles: CategoryRoleDAO[];

  @OneToMany(() => CompanyCategoryDAO, (categoryCompany) => categoryCompany.category, {
    cascade: true,
    eager: false,
  })
  companies: CompanyCategoryDAO[];
}

export default CategoryDAO;

