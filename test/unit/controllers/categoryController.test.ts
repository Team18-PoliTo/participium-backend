import { Request, Response, NextFunction } from "express";
import CategoryController from "../../../src/controllers/categoryController";
import { ICategoryService } from "../../../src/services/ICategoryService";

describe("CategoryController.getAllCategories", () => {
    let mockCategoryService: jest.Mocked<ICategoryService>;
    let controller: CategoryController;

    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockCategoryService = {
            getAllCategories: jest.fn(),
        };
        controller = new CategoryController(mockCategoryService);
        req = {};

        res = {
            status: jest.fn().mockReturnThis(), // allows chaining: res.status().json()
            json: jest.fn(),
        };

        next = jest.fn();
    });

    it("should return 200 and the list of categories", async () => {
        const categories = [
            { id: 1, name: "Potholes", description: "Road damage" },
            { id: 2, name: "Garbage", description: "Waste issues" },
        ];
        mockCategoryService.getAllCategories.mockResolvedValue(categories);

        await controller.getAllCategories(
            req as Request,
            res as Response,
            next as NextFunction
        );
        expect(mockCategoryService.getAllCategories).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(categories);
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next with an error when the service throws", async () => {
        const error = new Error("Database error");
        mockCategoryService.getAllCategories.mockRejectedValue(error);

        await controller.getAllCategories(
            req as Request,
            res as Response,
            next as NextFunction
        );
        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});