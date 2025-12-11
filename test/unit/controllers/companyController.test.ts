import { Request, Response, NextFunction } from "express";
import CompanyController from "../../../src/controllers/companyController";
import { ICompanyService } from "../../../src/services/ICompanyService";

describe("CompanyController", () => {
  let mockCompanyService: jest.Mocked<ICompanyService>;
  let controller: CompanyController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockCompanyService = {
      getAllCompanies: jest.fn(),
      getCompaniesByCategory: jest.fn(),
    };
    controller = new CompanyController(mockCompanyService);
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("getAll", () => {
    it("should return 200 and the list of companies", async () => {
      const companies = [
        { id: 1, name: "Company A" },
        { id: 2, name: "Company B" },
      ];
      mockCompanyService.getAllCompanies.mockResolvedValue(companies);

      await controller.getAll(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(mockCompanyService.getAllCompanies).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: "Company A" },
        { id: 2, name: "Company B" },
      ]);
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when service throws an Error", async () => {
      const error = new Error("Database error");
      mockCompanyService.getAllCompanies.mockRejectedValue(error);

      await controller.getAll(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Database error" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with non-Error exceptions", async () => {
      const error = { code: "UNKNOWN_ERROR" };
      mockCompanyService.getAllCompanies.mockRejectedValue(error);

      await controller.getAll(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getByCategory", () => {
    it("should return 200 and companies for the category", async () => {
      req.params = { categoryId: "1" };
      const companies = [
        { id: 1, name: "Company A" },
        { id: 2, name: "Company B" },
      ];
      mockCompanyService.getCompaniesByCategory.mockResolvedValue(companies);

      await controller.getByCategory(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(mockCompanyService.getCompaniesByCategory).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: "Company A" },
        { id: 2, name: "Company B" },
      ]);
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle invalid categoryId", async () => {
      req.params = { categoryId: "invalid" };
      const companies = [{ id: 1, name: "Company A" }];
      mockCompanyService.getCompaniesByCategory.mockResolvedValue(companies);

      await controller.getByCategory(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // parseInt("invalid") returns NaN, which is passed to the service
      expect(mockCompanyService.getCompaniesByCategory).toHaveBeenCalledWith(
        NaN
      );
    });

    it("should return 400 when service throws an Error", async () => {
      req.params = { categoryId: "1" };
      const error = new Error("Category not found");
      mockCompanyService.getCompaniesByCategory.mockRejectedValue(error);

      await controller.getByCategory(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Category not found" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with non-Error exceptions", async () => {
      req.params = { categoryId: "1" };
      const error = { code: "UNKNOWN_ERROR" };
      mockCompanyService.getCompaniesByCategory.mockRejectedValue(error);

      await controller.getByCategory(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
