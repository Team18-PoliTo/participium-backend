import {
  ExternalMaintainerDTO,
  InternalUserDTO,
  RoleDTO,
} from "../models/dto/InternalUserDTO";
import { CompanyMapper } from "./CompanyMapper";
import InternalUserDAO from "../models/dao/InternalUserDAO";

export class InternalUserMapper {
  static toDTO(userDAO: InternalUserDAO): InternalUserDTO {
    return {
      id: userDAO.id,
      email: userDAO.email,
      firstName: userDAO.firstName,
      lastName: userDAO.lastName,
      createdAt: userDAO.createdAt,
      activeTasks: userDAO.activeTasks,

      roles:
        userDAO.roles?.map(
          (userRole): RoleDTO => ({
            id: userRole.role.id,
            name: userRole.role.role,
            officeId: userRole.role.office?.id ?? null,
          })
        ) ?? [],

      status: userDAO.status ?? "ACTIVE",
    };
  }
}

export class ExternalMaintainerMapper {
  static toDTO(userDAO: InternalUserDAO): ExternalMaintainerDTO {
    const baseDTO = InternalUserMapper.toDTO(userDAO);
    return {
      ...baseDTO,
      company: userDAO.company ? CompanyMapper.toDTO(userDAO.company) : null,
    } as ExternalMaintainerDTO;
  }
}
