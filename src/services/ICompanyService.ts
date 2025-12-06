import { CompanyDTO } from "../models/dto/CompanyDTO";

export interface ICompanyService {
  getAllCompanies(): Promise<CompanyDTO[]>;
  getCompaniesByCategory(categoryId: number): Promise<CompanyDTO[]>;
}