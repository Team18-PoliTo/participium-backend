import CompanyController from "../controllers/companyController";
import CompanyService from "../services/implementation/companyService";
import CompanyRepository from "../repositories/implementation/CompanyRepository";
import CompanyCategoryRepository from "../repositories/implementation/CompanyCategoryRepository";

import { Router } from "express";

const router = Router();

const companyRepository = new CompanyRepository();
const companyCategoryRepository = new CompanyCategoryRepository();
const companyService = new CompanyService(
  companyCategoryRepository,
  companyRepository
);
const companyController = new CompanyController(companyService);

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Retrieve a list of all companies {id, name}
 *     tags: [Companies]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: A list of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       400:
 *         description: Error when fetching companies
 */
router.get("/", companyController.getAll.bind(companyController));

/**
 * @swagger
 * /companies/category/{categoryId}:
 *   get:
 *     summary: Retrieve companies by category ID {id, name}
 *     tags: [Companies]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The category ID
 *     responses:
 *       200:
 *         description: A list of companies in the specified category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       400:
 *         description: Error when fetching companies by category
 */
router.get(
  "/category/:categoryId",
  companyController.getByCategory.bind(companyController)
);

export default router;
