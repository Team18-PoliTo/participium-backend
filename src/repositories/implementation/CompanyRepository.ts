import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import CompanyDAO from "../../models/dao/CompanyDAO";

export class CompanyRepository {
  private repo: Repository<CompanyDAO>;

  constructor(repo?: Repository<CompanyDAO>) {
    this.repo = repo ?? AppDataSource.getRepository(CompanyDAO);
  }

  async findAll(): Promise<CompanyDAO[]> {
    return await this.repo.find({
      relations: ["categories", "categories.category"],
    });
  }

  async findById(id: number): Promise<CompanyDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["categories", "categories.category"],
    });
  }

  async findByName(name: string): Promise<CompanyDAO | null> {
    return await this.repo.findOne({
      where: { name },
      relations: ["categories", "categories.category"],
    });
  }

}

export default CompanyRepository;