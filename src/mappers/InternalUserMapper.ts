import InternalUserDAO from "../models/dao/InternalUserDAO";
import { ExternalMantainerDTO, InternalUserDTO } from "../models/dto/InternalUserDTO";

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

export class ExternalMantainerMapper {
  static toDTO(userDAO: InternalUserDAO): ExternalMantainerDTO {
    const baseDTO = InternalUserMapper.toDTO(userDAO);
    return {
      ...baseDTO,
      company: userDAO.company ? userDAO.company.id : null,
    } as ExternalMantainerDTO;
  }
}