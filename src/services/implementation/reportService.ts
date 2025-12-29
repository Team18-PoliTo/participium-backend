import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
import DelegatedReportDTO from "../../models/dto/DelegatedReportDTO";
import DelegatedReportMapper from "../../mappers/DelegatedReportMapper";
import {
  CreateReportRequestDTO,
  UpdateReportRequestDTO,
} from "../../models/dto/ValidRequestDTOs";
import { IReportRepository } from "../../repositories/IReportRepository";
import { ReportRepository } from "../../repositories/implementation/ReportRepository";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import { CategoryRoleRepository } from "../../repositories/implementation/CategoryRoleRepository";
import { CategoryRepository } from "../../repositories/implementation/CategoryRepository";
import InternalUserRepository from "../../repositories/InternalUserRepository";
import FileService from "../FileService";
import { IReportService } from "../IReportService";
import { v4 as uuidv4 } from "uuid";
import { ReportStatus } from "../../constants/ReportStatus";
import { GeocodingService } from "../GeocodingService";
import CompanyCategoryRepository from "../../repositories/implementation/CompanyCategoryRepository";
import { ExternalMaintainerDTO } from "../../models/dto/InternalUserDTO";
import { ExternalMaintainerMapper } from "../../mappers/InternalUserMapper";
import {
  validateStatusTransition,
  EXTERNAL_MAINTAINER_ROLE,
  EXTERNAL_MAINTAINER_ROLE_ID,
} from "../../constants/StatusTransitions";
import { emitCommentCreated } from "../../ws/internalSocket";
import { IDelegatedReportRepository } from "../../repositories/IDelegatedReportRepository";
import DelegatedReportRepository from "../../repositories/implementation/DelegatedReportRepository";
import { ReportViewContext } from "../../constants/ReportViewContext";
class ReportService implements IReportService {
  constructor(
    private readonly reportRepository: IReportRepository = new ReportRepository(),
    private readonly citizenRepository: ICitizenRepository = new CitizenRepository(),
    private readonly categoryRepository: CategoryRepository = new CategoryRepository(),
    private readonly categoryRoleRepository: CategoryRoleRepository = new CategoryRoleRepository(),
    private readonly internalUserRepository: InternalUserRepository = new InternalUserRepository(),
    private readonly companyCategoryRepository = new CompanyCategoryRepository(),
    private readonly delegatedReportRepository: IDelegatedReportRepository = new DelegatedReportRepository()
  ) {}

  /**
   * Selects an internal officer with the least number of active tasks for a given role ID.
   * If multiple officers have the same minimum number of active tasks, one is selected randomly.
   */
  private async selectUnoccupiedOfficerByRole(roleId: number) {
    const officersWithRole =
      await this.internalUserRepository.findByRoleId(roleId);
    if (officersWithRole.length === 0) {
      throw new Error(`No officers found with role ID ${roleId}`);
    }
    const officers = [...officersWithRole].sort(
      (a, b) => a.activeTasks - b.activeTasks
    );

    const minActiveTasks = officers[0].activeTasks;
    // Officers who have the minimum active tasks
    const filteredOfficers = officers.filter(
      (officer) => officer.activeTasks === minActiveTasks
    );
    console.log(`Officers with the least active tasks (${minActiveTasks}):`);

    // Randomly selects one officer from those with the least active tasks, if more than one
    if (filteredOfficers.length === 0) {
      throw new Error(`No officers available for role ID ${roleId}`);
    } else if (filteredOfficers.length === 1) {
      // Only one officer with the least active tasks
      this.internalUserRepository.incrementActiveTasks(filteredOfficers[0].id);
      return filteredOfficers[0];
    } else {
      // Multiple officers with the least active tasks, selects randomly
      const randomIndex = Math.floor(Math.random() * filteredOfficers.length);
      this.internalUserRepository.incrementActiveTasks(
        filteredOfficers[randomIndex].id
      );
      return filteredOfficers[randomIndex];
    }
  }

  /**
   * Selects an external maintainer with the least number of active tasks for a given company ID.
   * If multiple maintainers have the same minimum number of active tasks, one is selected randomly.
   */
  private async selectUnoccupiedMaintainerByCompany(companyId: number) {
    const maintainersInCompany =
      await this.internalUserRepository.findExternalMaintainersByCompany(
        companyId
      );

    if (maintainersInCompany.length === 0) {
      throw new Error(
        "This company does not have maintainers available at the moment, please choose another company"
      );
    }
    // since they are ordered by activeTasks ASC, the first one has the minimum
    const chosenMaintainer = maintainersInCompany[0];

    if (chosenMaintainer) {
      await this.internalUserRepository.incrementActiveTasks(
        chosenMaintainer.id
      );
      return chosenMaintainer;
    } else {
      throw new Error(
        "This company does not have maintainers available at the moment, please choose another company"
      );
    }
  }

  async create(
    data: CreateReportRequestDTO,
    citizenId: number
  ): Promise<ReportDTO> {
    const citizen = await this.citizenRepository.findById(citizenId);
    if (!citizen) {
      throw new Error("Citizen not found");
    }

    // Find category by ID
    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new Error(`Category not found with ID: ${data.categoryId}`);
    }

    // Validate that all temp files exist and are not expired
    const tempFiles = await FileService.validateTempFiles(data.photoIds);

    // Create report in database (without photo paths initially)
    const newReport = await this.reportRepository.create({
      citizen: citizen,
      isAnonymous: data.isAnonymous,
      title: data.title,
      description: data.description,
      category: category,
      createdAt: new Date(),
      location: JSON.stringify(data.location),
      address: await GeocodingService.getAddress(
        data.location.latitude,
        data.location.longitude
      ),
      status: ReportStatus.PENDING_APPROVAL,
    });

    // Prepare permanent paths for photos
    const moves = tempFiles.map((tempFile, index) => {
      const extension = tempFile.originalName.split(".").pop();
      const permanentPath = `reports/${newReport.id}/photo${
        index + 1
      }_${uuidv4()}.${extension}`;
      return {
        fileId: tempFile.fileId,
        permanentPath,
      };
    });

    try {
      // Move all files from temp to permanent (with rollback on failure)
      const permanentPaths = await FileService.moveMultipleToPermanent(moves);

      // Update report with permanent photo paths
      newReport.photo1 = permanentPaths[0];
      if (permanentPaths[1]) newReport.photo2 = permanentPaths[1];
      if (permanentPaths[2]) newReport.photo3 = permanentPaths[2];

      await this.reportRepository.update(newReport);

      return await ReportMapper.toDTO(newReport);
    } catch (error) {
      // If file moving fails, throw error
      // Report exists in DB without photos (degraded state)
      // Could be enhanced with a retry mechanism or status flag
      console.error("Failed to move photos for report", newReport.id, error);
      throw new Error("Failed to process photo uploads. Please try again.");
    }
  }

  async getReportsByStatus(
    status: string,
    viewContext?: ReportViewContext
  ): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByStatus(status);
    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report, viewContext))
    );
  }

  async getAssignedReportsInMap(
    corners: object[]
  ): Promise<Partial<ReportDTO>[]> {
    const reports = await this.reportRepository.findAllApproved();
    const [corner1, corner2] = corners as {
      latitude: number;
      longitude: number;
    }[];
    const minLat = Math.min(corner1.latitude, corner2.latitude);
    const minLong = Math.min(corner1.longitude, corner2.longitude);
    const maxLong = Math.max(corner1.longitude, corner2.longitude);
    const maxLat = Math.max(corner1.latitude, corner2.latitude);
    const filtered = reports.filter((report) => {
      const location = JSON.parse(report.location);
      return (
        location.latitude >= minLat &&
        location.latitude <= maxLat &&
        location.longitude >= minLong &&
        location.longitude <= maxLong
      );
    });
    return filtered.map((report) => ReportMapper.toDTOforMap(report));
  }
  async getReportById(reportId: number): Promise<ReportDTO> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    return ReportMapper.toDTO(report);
  }

  async getCommentsByReportId(reportId: number): Promise<any[]> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const comments =
      await this.reportRepository.findCommentsByReportId(reportId);
    return comments.map((c) => ({
      id: c.id,
      comment: c.comment,
      commentOwner_id: (c as any).comment_owner?.id,
      creation_date: (c as any).creation_date,
      report_id: reportId,
    }));
  }

  async createComment(
    reportId: number,
    userId: number,
    commentText: string
  ): Promise<any> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const user = await this.internalUserRepository.findById(userId);
    if (!user) {
      throw new Error("Internal user not found");
    }

    if (!commentText || commentText.trim().length === 0) {
      throw new Error("Comment text cannot be empty");
    }

    const comment = await this.reportRepository.createComment(
      reportId,
      userId,
      commentText.trim()
    );

    const newCommentPayload = {
      id: comment.id,
      comment: comment.comment,
      commentOwner_id: (comment as any).comment_owner?.id,
      creation_date: (comment as any).creation_date,
      report_id: reportId,
    };

    try {
      emitCommentCreated(reportId, newCommentPayload);
    } catch (e) {
      console.error(
        "Failed to emit comment.created via WebSocket for report",
        reportId,
        e
      );
    }

    return newCommentPayload;
  }

  async updateReport(
    reportId: number,
    data: UpdateReportRequestDTO,
    userId: number,
    userRole?: string
  ): Promise<ReportDTO> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    if (
      report.status === ReportStatus.RESOLVED ||
      report.status === ReportStatus.REJECTED
    ) {
      throw new Error(
        "Cannot update a report that is already Resolved or Rejected"
      );
    }

    // Load user
    const user = await this.internalUserRepository.findById(userId);
    if (!user) {
      throw new Error("Internal user not found");
    }

    const isExternalMaintainer =
      userRole === EXTERNAL_MAINTAINER_ROLE ||
      userRole?.includes(EXTERNAL_MAINTAINER_ROLE) ||
      user.roles?.some((role) => role.id === EXTERNAL_MAINTAINER_ROLE_ID);


    const isAssignedUser = report.assignedTo?.id === user.id;

    // External maintainers cannot change category
    if (isExternalMaintainer && data.categoryId) {
      throw new Error("External maintainers cannot change the report category");
    }

    // Category can only be changed in Pending stage
    if (data.categoryId && report.status !== ReportStatus.PENDING_APPROVAL) {
      throw new Error(
        "Cannot change category after report leaves Pending stage"
      );
    }

    // Validate status transition
    const transitionResult = validateStatusTransition(
      report.status,
      data.status,
      userRole || "",
      isExternalMaintainer,
      isAssignedUser
    );

    if (!transitionResult.valid) {
      throw new Error(transitionResult.errorMessage);
    }

    // PR Officers can update only Pending Approval
    if (
      userRole === "Public Relations Officer" ||
      userRole?.includes("Public Relations Officer")
    ) {
      if (report.status !== ReportStatus.PENDING_APPROVAL) {
        throw new Error(
          `PR officers can only update reports with status "${ReportStatus.PENDING_APPROVAL}". This report status is "${report.status}".`
        );
      }
    }

    // Only assigned officer can modify non-pending reports
    if (report.status !== ReportStatus.PENDING_APPROVAL) {
      if (!isAssignedUser) {
        throw new Error(
          "Only the currently assigned user can update this report"
        );
      }
    }

    // Load category
    let categoryToUse = report.category;

    if (data.categoryId) {
      const foundCategory = await this.categoryRepository.findById(
        data.categoryId
      );
      if (!foundCategory) {
        throw new Error(`Category not found with ID: ${data.categoryId}`);
      }
      categoryToUse = foundCategory;
    }

    const categoryNameToUse = categoryToUse.name;

    // External maintainers cannot assign reports
    if (isExternalMaintainer && data.status === ReportStatus.ASSIGNED) {
      throw new Error("External maintainers cannot assign reports");
    }

    // Validate before assignment
    if (data.status === ReportStatus.ASSIGNED) {
      const categoryRoleMapping =
        await this.categoryRoleRepository.findRoleByCategory(categoryNameToUse);

      if (!categoryRoleMapping) {
        throw new Error(`No role found for category: ${categoryNameToUse}`);
      }

      const officersWithRole = await this.internalUserRepository.findByRoleId(
        categoryRoleMapping.role.id
      );

      if (officersWithRole.length === 0) {
        throw new Error(
          `No officers available for category: ${categoryNameToUse}. Report remains in Pending Approval state.`
        );
      }
    }

    // Assign officer if needed
    let assignedTo = report.assignedTo;

    if (data.status === ReportStatus.ASSIGNED) {
      const categoryRoleMapping =
        await this.categoryRoleRepository.findRoleByCategory(categoryNameToUse);

      if (categoryRoleMapping) {
        assignedTo = await this.selectUnoccupiedOfficerByRole(
          categoryRoleMapping.role.id
        );
      }
    }

    // Resolve → decrement tasks and remove from delegated_reports
    if (data.status === ReportStatus.RESOLVED && report.assignedTo) {
      await this.internalUserRepository.decrementActiveTasks(
        report.assignedTo.id
      );

      // Remove from delegated_reports if this was a delegated report
      await this.delegatedReportRepository.deleteByReportId(reportId);
    }

    // Save final changes
    const updatedReport = await this.reportRepository.updateReport(reportId, {
      status: data.status,
      explanation: data.explanation,
      assignedTo: assignedTo,
      categoryId: categoryToUse.id,
    });

    return ReportMapper.toDTO(updatedReport);
  }

  async delegateReport(
    reportId: number,
    userId: number,
    companyId: number
  ): Promise<ExternalMaintainerDTO> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    if (report.assignedTo?.id !== userId) {
      throw new Error(
        "Only the currently assigned officer can delegate this report"
      );
    }
    if (
      report.status !== ReportStatus.ASSIGNED &&
      report.status !== ReportStatus.IN_PROGRESS &&
      report.assignedTo
    ) {
      throw new Error(
        "Only reports with status 'Assigned' or 'In Progress' can be delegated"
      );
    }

    // Get the delegating officer's role to ensure they can delegate
    const delegatingOfficer =
      await this.internalUserRepository.findById(userId);
    if (
      !delegatingOfficer ||
      !Array.isArray(delegatingOfficer.roles) ||
      delegatingOfficer.roles.length === 0
    ) {
      throw new Error("Delegating officer not found");
    }

    // Check that the officer's role can delegate (not 0, 1, 10, 28)
    const nonDelegatingRoles = [0, 1, 10, 28];
    const hasForbiddenRole = delegatingOfficer.roles.some((role) =>
      nonDelegatingRoles.includes(role.id)
    );
    if (hasForbiddenRole) {
      throw new Error("Your role does not have permission to delegate reports");
    }

    if (hasForbiddenRole) {
      throw new Error("Your role does not have permission to delegate reports");
    }

    // checks that the category sent actually handles that category
    // a bit overkill but better to be sure
    const companies =
      await this.companyCategoryRepository.findCompaniesByCategory(
        report.category.id
      );
    const companyHandlesCategory = companies.some((c) => c.id === companyId);

    if (!companyHandlesCategory) {
      throw new Error(
        "The selected company does not handle this report's category"
      );
    }
    // selects the external maintainer, already increments their active tasks
    const selectedMaintainer =
      await this.selectUnoccupiedMaintainerByCompany(companyId);

    await this.internalUserRepository.decrementActiveTasks(
      report.assignedTo!.id
    );

    report.status = ReportStatus.DELEGATED;
    report.assignedTo = selectedMaintainer;

    await this.reportRepository.updateStatus(
      reportId,
      ReportStatus.DELEGATED,
      undefined,
      selectedMaintainer
    );

    // Insert into delegated_reports table
    await this.delegatedReportRepository.create(reportId, userId);

    return ExternalMaintainerMapper.toDTO(report.assignedTo);
  }

  async getReportsByUser(
    citizenId: number,
    viewContext?: ReportViewContext
  ): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByUser(citizenId);

    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report, viewContext))
    );
  }

  async getReportsForStaff(
    staffId: number,
    statusFilter?: string,
    viewContext?: ReportViewContext
  ): Promise<ReportDTO[]> {
    let reports = await this.reportRepository.findByAssignedStaff(staffId);

    // Apply optional status filter
    if (statusFilter) {
      reports = reports.filter((report) => report.status === statusFilter);
    }

    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report, viewContext))
    );
  }

  async getReportsByOffice(
    staffId: number,
    viewContext?: ReportViewContext
  ): Promise<ReportDTO[]> {
    const staff =
      await this.internalUserRepository.findByIdWithRoleAndOffice(staffId);

    if (!staff) {
      throw new Error("Internal user not found");
    }

    const officeId = staff.roles
      ?.map((ur) => ur.role.office?.id)
      .find((id): id is number => typeof id === "number");

    if (!officeId) {
      return [];
    }
    const categories =
      await this.categoryRoleRepository.findCategoriesByOffice(officeId);

    const categoryIds = categories.map((c) => c.id);

    if (categoryIds.length === 0) {
      return [];
    }

    const reports =
      await this.reportRepository.findByCategoryIds(categoryIds);

    return Promise.all(
      reports.map((r) => ReportMapper.toDTO(r, viewContext))
    );
  }


  async getDelegatedReportsByUser(
    delegatedById: number
  ): Promise<DelegatedReportDTO[]> {
    const delegatedReports =
      await this.delegatedReportRepository.findReportsByDelegatedBy(
        delegatedById
      );
    return Promise.all(
      delegatedReports.map((dr) => DelegatedReportMapper.toDTO(dr))
    );
  }
}
export const reportService = new ReportService();
export default ReportService;
