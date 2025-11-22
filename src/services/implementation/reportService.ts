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
import MinIoService from "../MinIoService";
import FileService from "../FileService";
import { v4 as uuidv4 } from "uuid";
import { IReportService } from "../IReportService";
import { ReportStatus } from "../../constants/ReportStatus";
class ReportService implements IReportService {
  constructor(
    private reportRepository: IReportRepository = new ReportRepository(),
    private citizenRepository: ICitizenRepository = new CitizenRepository(),
    private categoryRepository: CategoryRepository = new CategoryRepository(),
    private categoryRoleRepository: CategoryRoleRepository = new CategoryRoleRepository(),
    private internalUserRepository: InternalUserRepository = new InternalUserRepository()
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
      this.internalUserRepository.incrementActiveTasks(filteredOfficers[randomIndex].id);
      return filteredOfficers[randomIndex];
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
      status: ReportStatus.PENDING_APPROVAL,
    });

    // Prepare permanent paths for photos
    const moves = tempFiles.map((tempFile, index) => {
      const extension = tempFile.originalName.split('.').pop();
      const permanentPath = `reports/${newReport.id}/photo${index + 1}_${uuidv4()}.${extension}`;
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
    return await Promise.all(reports.map((report) => ReportMapper.toDTO(report)));
  }

  async updateReport(
    reportId: number,
    data: UpdateReportRequestDTO,
    userRole?: string
  ): Promise<ReportDTO> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Authorization: PR Officers can only update reports in PENDING_APPROVAL status
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


  async getReportsByUser(citizenId: number): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByUser(citizenId);

    return await Promise.all(
        reports.map(report => ReportMapper.toDTO(report))
    );
  }

}
export const reportService = new ReportService();
export default ReportService;
