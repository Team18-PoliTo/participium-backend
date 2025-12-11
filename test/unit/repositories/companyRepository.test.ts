import { Repository } from "typeorm";
import { CompanyRepository } from "../../../src/repositories/implementation/CompanyRepository";
import CompanyDAO from "../../../src/models/dao/CompanyDAO";

describe("CompanyRepository", () => {
  let mockRepo: jest.Mocked<Repository<CompanyDAO>>;
  let repository: CompanyRepository;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as any;

    repository = new CompanyRepository(mockRepo);
  });

  describe("findAll", () => {
    it("should return all companies with relations", async () => {
      const companies = [
        {
          id: 1,
          name: "Company A",
          categories: [{ category: { id: 1, name: "Category 1" } }],
        },
        {
          id: 2,
          name: "Company B",
          categories: [{ category: { id: 2, name: "Category 2" } }],
        },
      ] as CompanyDAO[];

      mockRepo.find.mockResolvedValue(companies);

      const result = await repository.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ["categories", "categories.category"],
      });
      expect(result).toEqual(companies);
    });

    it("should return empty array when no companies exist", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return company by id with relations", async () => {
      const company = {
        id: 1,
        name: "Company A",
        categories: [{ category: { id: 1, name: "Category 1" } }],
      } as CompanyDAO;

      mockRepo.findOne.mockResolvedValue(company);

      const result = await repository.findById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["categories", "categories.category"],
      });
      expect(result).toEqual(company);
    });

    it("should return null when company not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("findByName", () => {
    it("should return company by name with relations", async () => {
      const company = {
        id: 1,
        name: "Company A",
        categories: [{ category: { id: 1, name: "Category 1" } }],
      } as CompanyDAO;

      mockRepo.findOne.mockResolvedValue(company);

      const result = await repository.findByName("Company A");

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: "Company A" },
        relations: ["categories", "categories.category"],
      });
      expect(result).toEqual(company);
    });

    it("should return null when company not found by name", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByName("NonExistent");

      expect(result).toBeNull();
    });
  });
});
