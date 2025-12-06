import { Request, Response, NextFunction } from "express";
import CompanyService from "../services/implementation/companyService";

/**
 * Controller for handling companies.
 */
class CompanyController {
  constructor(private companyService: CompanyService) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companies = await this.companyService.getAllCompanies();
      const response = companies.map((company) => ({
        id: company.id,
        name: company.name,
      }));
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async getByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);
      const companies = await this.companyService.getCompaniesByCategory(
        categoryId
      );
      const response = companies.map((company) => ({
        id: company.id,
        name: company.name,
      }));
      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export default CompanyController;
