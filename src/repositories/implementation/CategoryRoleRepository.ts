import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import CategoryRoleDAO from "../../models/dao/CategoryRoleDAO";

export class CategoryRoleRepository {
  private repo: Repository<CategoryRoleDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(CategoryRoleDAO);
  }

  async findByRoleId(roleId: number): Promise<CategoryRoleDAO[]> {
    return await this.repo.find({
      where: { role: { id: roleId } },
      relations: ["category", "role"],
    });
  }

  async findByCategoryId(categoryId: number): Promise<CategoryRoleDAO[]> {
    return await this.repo.find({
      where: { category: { id: categoryId } },
      relations: ["category", "role"],
    });
  }

  async findRoleByCategory(categoryName: string): Promise<CategoryRoleDAO | null> {
    return await this.repo.findOne({
      where: { category: { name: categoryName } },
      relations: ["role", "role.office"],
    });
  }

  async create(categoryRoleDAO: Partial<CategoryRoleDAO>): Promise<CategoryRoleDAO> {
    const categoryRole = this.repo.create(categoryRoleDAO);
    return await this.repo.save(categoryRole);
  }
}

