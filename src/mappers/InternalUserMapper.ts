import InternalUserDAO from "../models/dao/InternalUserDAO";
import { ExternalMaintainerDTO, InternalUserDTO } from "../models/dto/InternalUserDTO";
import { CompanyMapper } from "./CompanyMapper";

export class InternalUserMapper {
  static toDTO(userDAO: InternalUserDAO): InternalUserDTO {
    return {
      id: userDAO.id,
      email: userDAO.email,
      firstName: userDAO.firstName,
      lastName: userDAO.lastName,
      createdAt: userDAO.createdAt,
      activeTasks: userDAO.activeTasks,
      role:
        userDAO.role && (userDAO.role as any).role !== undefined
          ? (userDAO.role as any).role
          : (userDAO.role as any)?.id ?? 0,
      status: userDAO.status ?? "ACTIVE",
    };
  }
}

export class ExternalMaintainerMapper {
  static toDTO(userDAO: InternalUserDAO): ExternalMaintainerDTO {
    const baseDTO = InternalUserMapper.toDTO(userDAO);
    return {
      ...baseDTO,
      company: CompanyMapper.toDTO(userDAO.company),
    } as ExternalMaintainerDTO;
  }
}