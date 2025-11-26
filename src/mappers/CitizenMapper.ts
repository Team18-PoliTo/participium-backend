import CitizenDAO from "../models/dao/CitizenDAO";
import { CitizenDTO } from "../models/dto/CitizenDTO";

export class CitizenMapper {
  static toDTO(citizenDAO: CitizenDAO): CitizenDTO {
    return {
      id: citizenDAO.id,
      email: citizenDAO.email,
      username: citizenDAO.username,
      firstName: citizenDAO.firstName,
      lastName: citizenDAO.lastName,
      status: citizenDAO.status ?? "ACTIVE",
      createdAt: citizenDAO.createdAt,
      accountPhotoUrl: citizenDAO.accountPhotoUrl
    };
  }
}