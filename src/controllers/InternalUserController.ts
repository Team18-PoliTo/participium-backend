import { Request, Response, NextFunction } from "express";
import {
  DelegateReportRequestDTO,
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
  UpdateReportRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import { ReportDTO } from "../models/dto/ReportDTO";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { IReportService } from "../services/IReportService";
import { ReportStatus } from "../constants/ReportStatus";

interface IInternalUserService {
  register(data: RegisterInternalUserRequestDTO): Promise<InternalUserDTO>;
  update(
    id: number,
    data: UpdateInternalUserRequestDTO
  ): Promise<InternalUserDTO>;
  fetchUsers(): Promise<InternalUserDTO[]>;
  disableById(id: number): Promise<"ok" | "not_found">;
}

class InternalUserController {
  constructor(
    private internalUserService: IInternalUserService,
    private reportService?: IReportService
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registerDTO = plainToClass(
        RegisterInternalUserRequestDTO,
        req.body
      );
      const errors = await validate(registerDTO);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }

      const internalUser = await this.internalUserService.register(registerDTO);
      res.status(201).json(internalUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "InternalUser with this email already exists"
      ) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID format" });
        return;
      }

      const updateDTO = plainToClass(UpdateInternalUserRequestDTO, req.body);
      const errors = await validate(updateDTO);
      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }

      const updatedUser = await this.internalUserService.update(id, updateDTO);
      res.status(200).json(updatedUser);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "InternalUser with this email already exists" ||
          error.message === "Role not found" ||
          error.message === "Role already assigned")
      ) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async fetch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.internalUserService.fetchUsers();
      res.status(200).json(users);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id < 0) {
        res.status(400).json({ message: "Invalid internal user id" });
        return;
      }

      if ((req as any).auth?.sub && Number((req as any).auth.sub) === id) {
        res.status(403).json({ message: "You cannot delete your own account" });
        return;
      }

      const result = await this.internalUserService.disableById(id);
      if (result === "not_found") {
        res.status(404).json({ message: "Internal user not found" });
        return;
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async getReports(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.reportService) {
        res.status(500).json({ error: "Report service not configured" });
        return;
      }

      // Get the requesting user's role
      const userRole = (req as any).auth?.role;
      let status = req.query.status as string;

      // If user is a PR Officer (role 10) and requests non-pending status, return empty list
      if (
        userRole === "Public Relations Officer" ||
        userRole?.includes("Public Relations Officer")
      ) {
        if (status && status !== ReportStatus.PENDING_APPROVAL) {
          // PR Officers can only retrieve pending reports
          res.status(200).json([]);
          return;
        }
        // Default PR Officers to pending reports if no status specified
        status = ReportStatus.PENDING_APPROVAL;
      } else {
        // For other internal users (technical officers, etc.), default to pending if no status specified
        status = status || ReportStatus.PENDING_APPROVAL;
      }

      const reports: ReportDTO[] = await this.reportService.getReportsByStatus(
        status
      );
      res.status(200).json(reports);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async updateReportStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.reportService) {
        res.status(500).json({ error: "Report service not configured" });
        return;
      }

      const reportId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(reportId)) {
        res.status(400).json({ error: "Invalid report ID" });
        return;
      }

      const updateReportDTO = plainToClass(UpdateReportRequestDTO, req.body);
      const errors = await validate(updateReportDTO);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }

      const validStatuses = Object.values(ReportStatus);
      if (!validStatuses.includes(updateReportDTO.status as any)) {
        res.status(400).json({
          error: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const userRole = (req as any).auth?.role;
      const userId = (req as any).auth?.sub;

      const updatedReport = await this.reportService.updateReport(
        reportId,
        updateReportDTO,
        userId,
        userRole
      );

      res.status(200).json({
        message: "Report updated successfully",
        reportId: updatedReport.id,
        status: updatedReport.status,
        assignedTo: updatedReport.assignedTo
          ? `${updatedReport.assignedTo.firstName} ${updatedReport.assignedTo.lastName}`
          : null,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("PR officers can only update")) {
          res.status(403).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async delegateReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.reportService) {
        res.status(500).json({ error: "Report service not configured" });
        return;
      }

      const reportId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(reportId)) {
        res.status(400).json({ error: "Invalid report ID" });
        return;
      }

      const delegateReportDTO = plainToClass(
        DelegateReportRequestDTO,
        req.body
      );
      const errors = await validate(delegateReportDTO);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(", "))
          .join("; ");
        res.status(400).json({ error: errorMessages });
        return;
      }
      const userId = (req as any).auth?.sub;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const assignedTo = await this.reportService.delegateReport(
        reportId,
        userId,
        delegateReportDTO.companyId
      );

      res.status(200).json({
        assignedTo: assignedTo.id,
        message: `Report delegated successfully to maintainer ${assignedTo.firstName} ${assignedTo.lastName} from company ${assignedTo.company.name}`,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("currently assigned officer")) {
          res.status(403).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async getReportsForTechnicalOfficer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.reportService) {
        res.status(500).json({ error: "Report service not configured" });
        return;
      }

      const staffId = (req as any).auth?.sub;

      if (!staffId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Optional status filter from query parameter
      const statusFilter = req.query?.status as string | undefined;

      // Validate status filter if provided
      if (statusFilter) {
        const validStatuses = Object.values(ReportStatus);
        if (!validStatuses.includes(statusFilter as any)) {
          res.status(400).json({
            error: `Invalid status filter. Allowed values: ${validStatuses.join(", ")}`,
          });
          return;
        }
      }

      const reports = await this.reportService.getReportsForStaff(
        staffId,
        statusFilter
      );

      res.status(200).json(reports);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async getReportsByOffice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.reportService) {
        res.status(500).json({ error: "Report service not configured" });
        return;
      }

      const staffId = (req as any).auth?.sub;
      const userRole = (req as any).auth?.role;

      if (!staffId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (
        userRole === "Public Relations Officer" ||
        userRole?.includes("Public Relations Officer")
      ) {
        res.status(403).json({ error: "PR Officers cannot filter by office" });
        return;
      }
      const reports = await this.reportService.getReportsByOffice(staffId);

      res.status(200).json(reports);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export default InternalUserController;
