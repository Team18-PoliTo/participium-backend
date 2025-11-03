import UserDAO from "../models/dao/UserDAO";
import { UserDTO } from "../models/dto/UserDTO";

export class UserMapper {
  static toDTO(userDAO: UserDAO): UserDTO {
    return {
      id: userDAO.id,
      email: userDAO.email,
      username: userDAO.username,
      firstName: userDAO.firstName,
      lastName: userDAO.lastName,
      createdAt: userDAO.createdAt
    };
  }
}

