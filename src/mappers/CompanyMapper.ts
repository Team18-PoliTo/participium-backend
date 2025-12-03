import CompanyDAO from "../models/dao/CompanyDAO";
import { CompanyDTO } from "../models/dto/CompanyDTO";
import { ExternalMantainerMapper } from "./InternalUserMapper";

export class CompanyMapper {
  static toDTO(companyDAO: CompanyDAO): CompanyDTO {
    return {
      id: companyDAO.id,
      contactEmail: companyDAO.email,
      name: companyDAO.name,
      description: companyDAO.description,
    };
  }

  static toDTOwithCategories(companyDAO: CompanyDAO): CompanyDTO {
    return {
      id: companyDAO.id,
      contactEmail: companyDAO.email,
      name: companyDAO.name,
      description: companyDAO.description,
      categories:
        companyDAO.categories?.map((cat) => ({
          id: cat.category.id,
          name: cat.category.name,
        })) || [],
    };
  }

  static toDTOwithEmployees(companyDAO: CompanyDAO): CompanyDTO {
    return {
      id: companyDAO.id,
      contactEmail: companyDAO.email,
      name: companyDAO.name,
      description: companyDAO.description,
      employees:
        companyDAO.internalUsers?.map((user) =>
          ExternalMantainerMapper.toDTO(user)
        ) || [],
    };
  }
}
