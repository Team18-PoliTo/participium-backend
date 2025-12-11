import { Repository } from "typeorm";
import { CompanyCategoryRepository } from "../../../src/repositories/implementation/CompanyCategoryRepository";
import CompanyCategoryDAO from "../../../src/models/dao/CompanyCategoryDAO";
import CompanyDAO from "../../../src/models/dao/CompanyDAO";

describe("CompanyCategoryRepository", () => {
  let mockRepo: jest.Mocked<Repository<CompanyCategoryDAO>>;
  let repository: CompanyCategoryRepository;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
    } as any;

    repository = new CompanyCategoryRepository(mockRepo);
  });

  describe("findCompaniesByCategory", () => {
    it("should return companies for a given category", async () => {
      const company1 = { id: 1, name: "Company A" } as CompanyDAO;
      const company2 = { id: 2, name: "Company B" } as CompanyDAO;

      const companyCategories = [
        {
          id: 1,
          category: { id: 1, name: "Category 1" },
          company: company1,
        },
        {
          id: 2,
          category: { id: 1, name: "Category 1" },
          company: company2,
        },
      ] as CompanyCategoryDAO[];

      mockRepo.find.mockResolvedValue(companyCategories);

      const result = await repository.findCompaniesByCategory(1);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: {
          category: { id: 1 },
        },
        relations: ["category", "company"],
      });
      expect(result).toEqual([company1, company2]);
      expect(result.length).toBe(2);
    });

    it("should return empty array when no companies found for category", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await repository.findCompaniesByCategory(999);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it("should handle single company for category", async () => {
      const company = { id: 1, name: "Company A" } as CompanyDAO;
      const companyCategory = {
        id: 1,
        category: { id: 2, name: "Category 2" },
        company: company,
      } as CompanyCategoryDAO;

      mockRepo.find.mockResolvedValue([companyCategory]);

      const result = await repository.findCompaniesByCategory(2);

      expect(result).toEqual([company]);
      expect(result.length).toBe(1);
    });
  });
});
