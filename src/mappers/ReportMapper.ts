import ReportDAO from "../models/dao/ReportDAO";
import { ReportDTO, AssignedOfficerDTO, CategoryDTO } from "../models/dto/ReportDTO";

export class ReportMapper {
  static toDTO(reportDAO: ReportDAO): ReportDTO {
    let assignedTo: AssignedOfficerDTO | null = null;
    if (reportDAO.assignedTo) {
      assignedTo = {
        id: reportDAO.assignedTo.id,
        email: reportDAO.assignedTo.email,
        firstName: reportDAO.assignedTo.firstName,
        lastName: reportDAO.assignedTo.lastName,
      };
    }

    const categoryDTO: CategoryDTO = {
      id: reportDAO.category.id,
      name: reportDAO.category.name,
      description: reportDAO.category.description,
    };

    return { 
      id: reportDAO.id,
      citizenId: reportDAO.citizen.id,
      title: reportDAO.title,
      description: reportDAO.description,
      category: categoryDTO,
      photos: [reportDAO.photo1, reportDAO.photo2, reportDAO.photo3].filter(Boolean),
      binaryPhotos: [],
      createdAt: reportDAO.createdAt,
      location: JSON.parse(reportDAO.location),
      status: reportDAO.status,
      explanation: reportDAO.explanation,
      assignedTo,
    };
  } 
}