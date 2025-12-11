import CompanyService from "../../../src/services/implementation/companyService";
import { CompanyCategoryRepository } from "../../../src/repositories/implementation/CompanyCategoryRepository";
import { CompanyRepository } from "../../../src/repositories/implementation/CompanyRepository";
import { CompanyMapper } from "../../../src/mappers/CompanyMapper";

describe("CompanyService", () => {
  let mockCompanyCategoryRepository: jest.Mocked<CompanyCategoryRepository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;
  let service: CompanyService;
  let toDTOSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCompanyCategoryRepository = {
      findCompaniesByCategory: jest.fn(),
    } as any;

    mockCompanyRepository = {
      findAll: jest.fn(),
    } as any;

    // Spy on CompanyMapper.toDTO
    toDTOSpy = jest
      .spyOn(CompanyMapper, "toDTO")
      .mockImplementation((company) => ({
        id: company.id,
        name: company.name,
        contactEmail: company.email,
        description: company.description,
      }));

    service = new CompanyService(
      mockCompanyCategoryRepository,
      mockCompanyRepository
    );
  });

  afterEach(() => {
    toDTOSpy.mockRestore();
  });

  describe("getAllCompanies", () => {
    it("should return all companies as DTOs", async () => {
      const companies = [
        { id: 1, name: "Company A", email: "a@test.com" },
        { id: 2, name: "Company B", email: "b@test.com" },
      ] as any;

      mockCompanyRepository.findAll.mockResolvedValue(companies);

      const result = await service.getAllCompanies();

      expect(mockCompanyRepository.findAll).toHaveBeenCalledTimes(1);
      expect(toDTOSpy).toHaveBeenCalledTimes(2);
      expect(toDTOSpy).toHaveBeenCalledWith(companies[0]);
      expect(toDTOSpy).toHaveBeenCalledWith(companies[1]);
      // The mock implementation will return the mapped DTO
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, name: "Company A" });
      expect(result[1]).toMatchObject({ id: 2, name: "Company B" });
    });

    it("should return empty array when no companies exist", async () => {
      mockCompanyRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllCompanies();

      expect(result).toEqual([]);
      expect(toDTOSpy).not.toHaveBeenCalled();
    });
  });

  describe("getCompaniesByCategory", () => {
    it("should return companies for a category as DTOs", async () => {
      const companies = [
        { id: 1, name: "Company A", email: "a@test.com" },
        { id: 2, name: "Company B", email: "b@test.com" },
      ] as any;

      mockCompanyCategoryRepository.findCompaniesByCategory.mockResolvedValue(
        companies
      );

      const result = await service.getCompaniesByCategory(1);

      expect(
        mockCompanyCategoryRepository.findCompaniesByCategory
      ).toHaveBeenCalledWith(1);
      expect(toDTOSpy).toHaveBeenCalledTimes(2);
      expect(toDTOSpy).toHaveBeenCalledWith(companies[0]);
      expect(toDTOSpy).toHaveBeenCalledWith(companies[1]);
      // The mock implementation will return the mapped DTO
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, name: "Company A" });
      expect(result[1]).toMatchObject({ id: 2, name: "Company B" });
    });

    it("should return empty array when no companies found for category", async () => {
      mockCompanyCategoryRepository.findCompaniesByCategory.mockResolvedValue(
        []
      );

      const result = await service.getCompaniesByCategory(999);

      expect(result).toEqual([]);
      expect(toDTOSpy).not.toHaveBeenCalled();
    });
  });
});
