import CategoryDAO from "../../models/dao/CategoryDAO";
import { CategoryDTO } from "../../models/dto/CategoryDTO";
import { ICategoryService } from "../ICategoryService";
import CategoryRepository from "../../repositories/implementation/CategoryRepository";

export class CategoryService implements ICategoryService {
    constructor(private readonly categoryRepository: CategoryRepository) {}

    async getAllCategories(): Promise<CategoryDTO[]> {
        const categories: CategoryDAO[] = await this.categoryRepository.findAll();

        return categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
        }));
    }
}

export default CategoryService;
