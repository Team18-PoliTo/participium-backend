import ReportDAO from "../models/dao/ReportDAO";
import {
  ReportDTO,
  AssignedOfficerDTO,
  CategoryDTO,
} from "../models/dto/ReportDTO";
import MinIoService from "../services/MinIoService";
import { ReportViewContext } from "../constants/ReportViewContext";

export class ReportMapper {
  static async toDTO(
    reportDAO: ReportDAO,
    // Default INTERNAL because this mapper is primarily used
    // by internal/staff endpoints. Citizen endpoints must
    // explicitly pass ReportViewContext.CITIZEN.
    viewContext: ReportViewContext = ReportViewContext.INTERNAL
  ): Promise<ReportDTO> {
    let assignedTo: AssignedOfficerDTO | null = null;
    if (reportDAO.assignedTo) {
      assignedTo = {
        id: reportDAO.assignedTo.id,
        email: reportDAO.assignedTo.email,
        firstName: reportDAO.assignedTo.firstName,
        lastName: reportDAO.assignedTo.lastName,
        companyName: reportDAO.assignedTo.company?.name,
      };
    }

    const categoryDTO: CategoryDTO = {
      id: reportDAO.category.id,
      name: reportDAO.category.name,
      description: reportDAO.category.description,
    };

    const photoKeys = [
      reportDAO.photo1,
      reportDAO.photo2,
      reportDAO.photo3,
    ].filter((key): key is string => Boolean(key));

    const photoUrlsRaw = await Promise.all(
      photoKeys.map((key) => MinIoService.getPresignedUrl(key))
    );
    const photoUrls = photoUrlsRaw.filter(Boolean);

    const isAnonymous = reportDAO.isAnonymous;
    const showRealCitizen =
      viewContext === ReportViewContext.INTERNAL || !isAnonymous;

    const delegatedById =
      reportDAO.delegations && reportDAO.delegations.length > 0
        ? reportDAO.delegations[0].delegatedBy.id
        : null;

    return {
      id: reportDAO.id,
      isAnonymous,
      citizenId: showRealCitizen ? reportDAO.citizen.id : undefined,
      citizenName: showRealCitizen ? reportDAO.citizen.firstName : "Anonymous",
      citizenLastName: showRealCitizen
        ? reportDAO.citizen.lastName
        : "Anonymous",

      title: reportDAO.title,
      description: reportDAO.description,
      category: categoryDTO,
      photos: photoUrls,
      createdAt: reportDAO.createdAt,
      location: JSON.parse(reportDAO.location),
      address: reportDAO.address,
      status: reportDAO.status,
      explanation: reportDAO.explanation,
      assignedTo,
      delegatedById,
    };
  }

  static toDTOforMap(reportDAO: ReportDAO): object {
    const isAnonymous = reportDAO.isAnonymous;

    return {
      id: reportDAO.id,
      citizenName: isAnonymous ? "Anonymous" : reportDAO.citizen.firstName,
      citizenLastName: isAnonymous ? "Anonymous" : reportDAO.citizen.lastName,
      title: reportDAO.title,
      status: reportDAO.status,
      description: reportDAO.description,
      location: JSON.parse(reportDAO.location),
      category: reportDAO.category,
    };
  }
}
