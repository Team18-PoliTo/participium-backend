import ReportDAO from "../models/dao/ReportDAO";
import { ReportDTO } from "../models/dto/ReportDTO";

export class ReportMapper {
  static toDTO(reportDAO: ReportDAO): ReportDTO {
    return { 
      id: reportDAO.id,
      citizenId: reportDAO.citizen.id,
      title: reportDAO.title,
      description: reportDAO.description,
      category: reportDAO.category,
      photos: [reportDAO.photo1, reportDAO.photo2, reportDAO.photo3].filter(Boolean),
      binaryPhotos: [],
      createdAt: reportDAO.createdAt,
      location: JSON.parse(reportDAO.location),
      status: reportDAO.status,
    };
  } 
}