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
      role: userDAO.role.id,
    };
  }
}
