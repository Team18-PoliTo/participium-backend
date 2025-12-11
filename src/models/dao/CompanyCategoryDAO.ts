/* istanbul ignore file */
import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from "typeorm";
import CategoryDAO from "./CategoryDAO";
import CompanyDAO from "./CompanyDAO";

@Entity("company_categories")
@Unique(["category", "company"])
class CompanyCategoryDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @ManyToOne(() => CategoryDAO, (category) => category.companies, {
    nullable: false,
    onDelete: "CASCADE",
  })
  category: CategoryDAO;

  @ManyToOne(() => CompanyDAO, (company) => company.categories, {
    nullable: false,
    onDelete: "CASCADE",
  })
  company: CompanyDAO;
}

export default CompanyCategoryDAO;
