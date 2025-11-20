import InternalUserDAO from "../models/dao/InternalUserDAO";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";

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
