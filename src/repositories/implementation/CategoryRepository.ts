import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import CategoryDAO from "../../models/dao/CategoryDAO";

export class CategoryRepository {
  private readonly repo: Repository<CategoryDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(CategoryDAO);
  }

  async findAllSimple(): Promise<CategoryDAO[]> {
    return await this.repo.find({
      select: ["id", "name", "description"],
      order: { id: "ASC" },
    });
  }

  async findAll(): Promise<CategoryDAO[]> {
    return await this.repo.find({
      relations: ["categoryRoles", "categoryRoles.role"],
      order: { id: "ASC" },
    });
  }

  async findById(id: number): Promise<CategoryDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["categoryRoles", "categoryRoles.role"],
    });
  }

  async findByName(name: string): Promise<CategoryDAO | null> {
    return await this.repo.findOne({
      where: { name },
      relations: ["categoryRoles", "categoryRoles.role"],
    });
  }

  async create(categoryDAO: Partial<CategoryDAO>): Promise<CategoryDAO> {
    const category = this.repo.create(categoryDAO);
    return await this.repo.save(category);
  }
}

export default CategoryRepository;
