// test/unit/services/categoryService.unit.test.ts
import CategoryService from "../../../src/services/implementation/categoryService";
import CategoryRepository from "../../../src/repositories/implementation/CategoryRepository";
import CategoryDAO from "../../../src/models/dao/CategoryDAO";

describe("CategoryService", () => {
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let service: CategoryService;

  beforeEach(() => {
    mockCategoryRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    service = new CategoryService(mockCategoryRepository);
  });

  it("getAllCategories should map DAO to DTO", async () => {
    const daos: CategoryDAO[] = [
      { id: 1, name: "Potholes", description: "Road issues" } as CategoryDAO,
      { id: 2, name: "Garbage", description: "Trash problems" } as CategoryDAO,
    ];

    mockCategoryRepository.findAll.mockResolvedValue(daos);

    const result = await service.getAllCategories();

    expect(mockCategoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { id: 1, name: "Potholes", description: "Road issues" },
      { id: 2, name: "Garbage", description: "Trash problems" },
    ]);
  });

  it("getAllCategories should return empty array when repository returns empty list", async () => {
    mockCategoryRepository.findAll.mockResolvedValue([]);

    const result = await service.getAllCategories();

    expect(mockCategoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
