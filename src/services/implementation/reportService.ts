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
  private async selectOfficerByRole(roleId: number) {
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
      return filteredOfficers[0];
    } else {
      // Multiple officers with the least active tasks, selects randomly
      const randomIndex = Math.floor(Math.random() * filteredOfficers.length);
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

    // Find category by name
    const category = await this.categoryRepository.findByName(data.category);
    if (!category) {
      throw new Error(`Category not found: ${data.category}`);
    }

    // Create report
    const newReport = await this.reportRepository.create({
      citizen: citizen,
      title: data.title,
      description: data.description,
      category: category,
      createdAt: new Date(),
      location: JSON.stringify(data.location),
      status: ReportStatus.PENDING_APPROVAL,
    });
    // Creates the ObjectKey to be used in minIO
    const pathPrefix = `citizens/${citizen.id}/reports/${newReport.id}/`;

    newReport.photo1 = pathPrefix + data.binaryPhoto1.filename;
    if (data.binaryPhoto2) {
      newReport.photo2 = pathPrefix + data.binaryPhoto2.filename;
    }
    if (data.binaryPhoto3) {
      newReport.photo3 = pathPrefix + data.binaryPhoto3.filename;
    }

    const uploadedPhotos: { [key: string]: string } = {};

    const toBuffer = (payload: string | Buffer): Buffer =>
      Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "base64");

    if (data.binaryPhoto1) {
      const objectKey1 = `${pathPrefix}${uuidv4()}-${
        data.binaryPhoto1.filename
      }`;
      uploadedPhotos.photo1 = await MinIoService.uploadFile(
        objectKey1,
        toBuffer(data.binaryPhoto1.data),
        data.binaryPhoto1.mimetype
      );
    }

    if (data.binaryPhoto2) {
      const objectKey2 = `${pathPrefix}${uuidv4()}-${
        data.binaryPhoto2.filename
      }`;
      uploadedPhotos.photo2 = await MinIoService.uploadFile(
        objectKey2,
        toBuffer(data.binaryPhoto2.data),
        data.binaryPhoto2.mimetype
      );
    }

    if (data.binaryPhoto3) {
      const objectKey3 = `${pathPrefix}${uuidv4()}-${
        data.binaryPhoto3.filename
      }`;
      uploadedPhotos.photo3 = await MinIoService.uploadFile(
        objectKey3,
        toBuffer(data.binaryPhoto3.data),
        data.binaryPhoto3.mimetype
      );
    }

    if (uploadedPhotos.photo1) newReport.photo1 = uploadedPhotos.photo1;
    if (uploadedPhotos.photo2) newReport.photo2 = uploadedPhotos.photo2;
    if (uploadedPhotos.photo3) newReport.photo3 = uploadedPhotos.photo3;

    await this.reportRepository.update(newReport);

    return ReportMapper.toDTO(newReport);
  }

  async getReportsByStatus(status: string): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByStatus(status);
    return reports.map((report) => ReportMapper.toDTO(report));
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

    // Determine the category name to use (use provided category or existing one)
    const categoryNameToUse = data.category || report.category.name;

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
    if (data.category) {
      const newCategory = await this.categoryRepository.findByName(
        data.category
      );
      if (!newCategory) {
        throw new Error(`Category not found: ${data.category}`);
      }
      report.category = newCategory;
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
        const selectedOfficer = await this.selectOfficerByRole(
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

    return ReportMapper.toDTO(updatedReport);
  }
}
export const reportService = new ReportService();
export default ReportService;
