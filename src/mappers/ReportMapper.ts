import ReportDAO from "../models/dao/ReportDAO";
import { ReportDTO, AssignedOfficerDTO, CategoryDTO } from "../models/dto/ReportDTO";
import MinIoService from "../services/MinIoService";

export class ReportMapper {
  static async toDTO(reportDAO: ReportDAO): Promise<ReportDTO> {
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

    // Get photo object keys (MinIO paths)
    const photoKeys = [reportDAO.photo1, reportDAO.photo2, reportDAO.photo3].filter(Boolean) as string[];
    
    // Generate pre-signed URLs for each photo (valid for 7 days)
    const photoUrls = await Promise.all(
      photoKeys.map(key => MinIoService.getPresignedUrl(key))
    );

    return { 
      id: reportDAO.id,
      citizenId: reportDAO.citizen.id,
      title: reportDAO.title,
      description: reportDAO.description,
      category: categoryDTO,
      photos: photoUrls, // Contains pre-signed URLs (valid for 7 days)
      createdAt: reportDAO.createdAt,
      location: JSON.parse(reportDAO.location),
      status: reportDAO.status,
      explanation: reportDAO.explanation,
      assignedTo,
    };
  } 
}