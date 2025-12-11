import { Router } from "express";
import CategoryController from "../controllers/categoryController";
import CategoryService from "../services/implementation/categoryService";
import CategoryRepository from "../repositories/implementation/CategoryRepository";

const router = Router();

// Dependency Injection
const categoryRepository = new CategoryRepository();
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Endpoints for fetching issue categories
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     description: Returns the full list of predefined categories.
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", categoryController.getAllCategories.bind(categoryController));

export default router;
