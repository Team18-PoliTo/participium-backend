import { CategoryDTO } from "../models/dto/CategoryDTO";

export interface ICategoryService {
    getAllCategories(): Promise<CategoryDTO[]>;
}