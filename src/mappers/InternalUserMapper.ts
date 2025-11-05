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
      // role may be undefined if relations weren't loaded; default to 0 (TBD)
      role:
        userDAO.role && (userDAO.role as any).id !== undefined
          ? (userDAO.role as any).id
          : 0,
    };
  }
}
