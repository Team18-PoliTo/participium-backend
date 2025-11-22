import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import CategoryRoleDAO from "../../models/dao/CategoryRoleDAO";

export class CategoryRoleRepository {
  private repo: Repository<CategoryRoleDAO>;

  constructor(repo?: Repository<CategoryRoleDAO>) {
    this.repo = repo ?? AppDataSource.getRepository(CategoryRoleDAO);
  }

  async findByRoleId(roleId: number) {
    return this.repo.find({
      where: { role: { id: roleId } },
      relations: ["category", "role"],
    });
  }

  async findByCategoryId(categoryId: number) {
    return this.repo.find({
      where: { category: { id: categoryId } },
      relations: ["category", "role"],
    });
  }

  async findRoleByCategory(categoryName: string) {
    return this.repo.findOne({
      where: { category: { name: categoryName } },
      relations: ["role", "role.office"],
    });
  }

  async create(payload: Partial<CategoryRoleDAO>) {
    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }

  async findCategoriesByOffice(officeId: number) {
    return this.repo.find({
      where: {
        role: {
          office: { id: officeId },
        },
      },
      relations: ["category", "role", "role.office"],
    }).then(results => results.map(cr => cr.category));
  }
}
