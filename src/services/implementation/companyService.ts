import { CompanyDTO } from "../../models/dto/CompanyDTO";
import { CompanyMapper } from "../../mappers/CompanyMapper";
import { CompanyCategoryRepository } from "../../repositories/implementation/CompanyCategoryRepository";
import { CompanyRepository } from "../../repositories/implementation/CompanyRepository";
import { ICompanyService } from "../ICompanyService";

export class CompanyService implements ICompanyService {
  constructor(
    private readonly companyCategoryRepository: CompanyCategoryRepository = new CompanyCategoryRepository(),
    private readonly companyRepository: CompanyRepository = new CompanyRepository()
  ) {}

  async getAllCompanies(): Promise<CompanyDTO[]> {
    const companies = await this.companyRepository.findAll();
    return companies.map((company) => CompanyMapper.toDTO(company));
  }

  async getCompaniesByCategory(categoryId: number): Promise<CompanyDTO[]> {
    const companies =
      await this.companyCategoryRepository.findCompaniesByCategory(categoryId);

    return companies.map((company) => CompanyMapper.toDTO(company));
  }
}

export const companyService = new CompanyService();

export default CompanyService;
