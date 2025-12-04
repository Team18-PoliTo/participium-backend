import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import InternalUserDAO from "./InternalUserDAO";
import CompanyCategoryDAO from "./CompanyCategoryDAO";


@Entity("companies")
class CompanyDAO {
  @PrimaryGeneratedColumn({ type: "integer" })
  id: number;

  @Column({ nullable: false, unique: true })
  name: string;

  @Column({ nullable: false })
  email: string;

  @Column({ nullable: false })
  description: string;

  @OneToMany(() => InternalUserDAO, (internalUsers) => internalUsers.company, {
    nullable: true,
  })
  internalUsers: InternalUserDAO[];

  @OneToMany(() => CompanyCategoryDAO, (categoryCompany) => categoryCompany.category, {
    cascade: true,
    eager: false,
  })
  categories: CompanyCategoryDAO[];
}

export default CompanyDAO;
