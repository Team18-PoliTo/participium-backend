// src/repositories/implementation/CompanyCategoryRepository.ts
import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import CompanyCategoryDAO from "../../models/dao/CompanyCategoryDAO";
import CompanyDAO from "../../models/dao/CompanyDAO";

export class CompanyCategoryRepository {
  private repo: Repository<CompanyCategoryDAO>;

  constructor(repo?: Repository<CompanyCategoryDAO>) {
    this.repo = repo ?? AppDataSource.getRepository(CompanyCategoryDAO);
  }
/*
  async findByCompanyId(companyId: number): Promise<CompanyCategoryDAO[]> {
    return await this.repo.find({
      where: { company: { id: companyId } },
      relations: ["category", "company"],
    });
  }

  async findByCategoryId(categoryId: number): Promise<CompanyCategoryDAO[]> {
    return await this.repo.find({
      where: { category: { id: categoryId } },
      relations: ["category", "company"],
    });
  }
  */

  async findCompaniesByCategory(categoryId: number): Promise<CompanyDAO[]> {
    return await this.repo
      .find({
        where: {
          category: { id: categoryId },
        },
        relations: ["category", "company"],
      })
      .then((results) => results.map((cc) => cc.company));
  }
}

export default CompanyCategoryRepository;