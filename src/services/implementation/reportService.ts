import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
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
import { v4 as uuidv4 } from "uuid";
import { IReportService } from "../IReportService";
import { ReportStatus } from "../../constants/ReportStatus";
import { GeocodingService } from "../GeocodingService";
import CompanyCategoryRepository from "../../repositories/implementation/CompanyCategoryRepository";
import { ExternalMaintainerDTO } from "../../models/dto/InternalUserDTO";
import { ExternalMaintainerMapper } from "../../mappers/InternalUserMapper";
class ReportService implements IReportService {
  constructor(
    private reportRepository: IReportRepository = new ReportRepository(),
    private citizenRepository: ICitizenRepository = new CitizenRepository(),
    private categoryRepository: CategoryRepository = new CategoryRepository(),
    private categoryRoleRepository: CategoryRoleRepository = new CategoryRoleRepository(),
    private internalUserRepository: InternalUserRepository = new InternalUserRepository(),
    private companyCategoryRepository = new CompanyCategoryRepository()
  ) {}

  /**
   * Selects an internal officer with the least number of active tasks for a given role ID.
   * If multiple officers have the same minimum number of active tasks, one is selected randomly.
   */
  private async selectUnoccupiedOfficerByRole(roleId: number) {
    const officersWithRole = await this.internalUserRepository.findByRoleId(
      roleId
    );
    if (officersWithRole.length === 0) {
      throw new Error(`No officers found with role ID ${roleId}`);
    }
    const officers = officersWithRole.sort(
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

  async getReportsByStatus(status: string): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByStatus(status);
    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report))
    );
  }

  async getAssignedReportsInMap(
    corners: Object[]
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

    /** Authorization:
     * - ADMIN can update any report
     * - PR Officers can only update reports with status "Pending Approval"
     * - Technical Officers can only update reports assigned to them
     */
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

    if (report.status !== ReportStatus.PENDING_APPROVAL) {
      const user = await this.internalUserRepository.findById(userId);
      if (!user) {
        throw new Error("Internal user not found");
      }
      if (!report.assignedTo || report.assignedTo.id !== user.id) {
        throw new Error(
          "Only the currently assigned officer can update this report to the selected status"
        );
      }
    }

    // Determine the category to use (use provided categoryId or existing one)
    const categoryToUse = data.categoryId
      ? await this.categoryRepository.findById(data.categoryId)
      : report.category;

    if (data.categoryId && !categoryToUse) {
      throw new Error(`Category not found with ID: ${data.categoryId}`);
    }

    const categoryNameToUse = categoryToUse!.name;

    // If status is "Assigned", validate officer availability BEFORE making any changes
    if (data.status === ReportStatus.ASSIGNED) {
      // Find role that handles this category
      const categoryRoleMapping =
        await this.categoryRoleRepository.findRoleByCategory(categoryNameToUse);
      if (!categoryRoleMapping) {
        throw new Error(`No role found for category: ${categoryNameToUse}`);
      }

      // Check if officers are available for this role (before updating report)
      const officersWithRole = await this.internalUserRepository.findByRoleId(
        categoryRoleMapping.role.id
      );
      if (officersWithRole.length === 0) {
        throw new Error(
          `No officers available for category: ${categoryNameToUse}. Report remains in Pending Approval state.`
        );
      }
    }

    // Now that validation is complete, proceed with updates
    // Update category if provided (if it was wrong)
    if (data.categoryId && categoryToUse) {
      report.category = categoryToUse;
    }

    // Update status
    report.status = data.status;

    // If status is "Assigned", auto-assign to an officer based on category
    if (data.status === ReportStatus.ASSIGNED) {
      // Find role that handles this category
      const categoryRoleMapping =
        await this.categoryRoleRepository.findRoleByCategory(categoryNameToUse);
      // We already validated this exists in the validation phase above
      if (categoryRoleMapping) {
        // Randomly select an officer with that role
        const selectedOfficer = await this.selectUnoccupiedOfficerByRole(
          categoryRoleMapping.role.id
        );
        report.assignedTo = selectedOfficer;
      }
    }

    // Save report with updated status, category, and assignment, along with explanation
    const updatedReport = await this.reportRepository.updateStatus(
      reportId,
      data.status,
      data.explanation,
      report.assignedTo
    );

    return await ReportMapper.toDTO(updatedReport);
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
    const selectedMaintainer = await this.selectUnoccupiedMaintainerByCompany(
      companyId
    );

    await this.internalUserRepository.decrementActiveTasks(
      report.assignedTo!.id
    );

    report.status = ReportStatus.DELEGATED;
    report.assignedTo = selectedMaintainer;

    const updatedReport = await this.reportRepository.updateStatus(
      reportId,
      ReportStatus.DELEGATED,
      undefined,
      selectedMaintainer
    );

    return ExternalMaintainerMapper.toDTO(report.assignedTo);
  }

  async getReportsByUser(citizenId: number): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByUser(citizenId);

    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report))
    );
  }

  async getReportsForStaff(staffId: number): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByAssignedStaff(staffId);

    return await Promise.all(
      reports.map((report) => ReportMapper.toDTO(report))
    );
  }

  async getReportsByOffice(staffId: number): Promise<ReportDTO[]> {
    const staff = await this.internalUserRepository.findByIdWithRoleAndOffice(
      staffId
    );
    if (!staff) {
      throw new Error("Internal user not found");
    }

    const officeId = staff.role.office?.id;
    if (!officeId) {
      return [];
    }

    const categories = await this.categoryRoleRepository.findCategoriesByOffice(
      officeId
    );
    const categoryIds = categories.map((c) => c.id);

    if (categoryIds.length === 0) {
      return [];
    }

    const reports = await this.reportRepository.findByCategoryIds(categoryIds);

    return Promise.all(reports.map((r) => ReportMapper.toDTO(r)));
  }
}
export const reportService = new ReportService();
export default ReportService;