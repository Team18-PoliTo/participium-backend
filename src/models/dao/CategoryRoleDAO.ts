/* istanbul ignore file */
import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from "typeorm";
import CategoryDAO from "./CategoryDAO";
import RoleDAO from "./RoleDAO";

@Entity("category_roles")
@Unique(["category", "role"])
class CategoryRoleDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @ManyToOne(() => CategoryDAO, (category) => category.categoryRoles, {
    nullable: false,
    onDelete: "CASCADE",
  })
  category: CategoryDAO;

  @ManyToOne(() => RoleDAO, (role) => role.categoryRoles, {
    nullable: false,
    onDelete: "CASCADE",
  })
  role: RoleDAO;
}

export default CategoryRoleDAO;
