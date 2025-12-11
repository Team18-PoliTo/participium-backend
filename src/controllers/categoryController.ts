// src/controllers/categoryController.ts
import { Request, Response, NextFunction } from "express";
import { ICategoryService } from "../services/ICategoryService";

class CategoryController {
  constructor(private readonly categoryService: ICategoryService) {}

  // GET /api/categories
  getAllCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categories = await this.categoryService.getAllCategories();
      res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  };
}

export default CategoryController;
