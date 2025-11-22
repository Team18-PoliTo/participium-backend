import { Router } from "express";
import InternalUserController from "../controllers/InternalUserController";
import InternalUserService from "../services/internalUserService";
import InternalUserRepository from "../repositories/InternalUserRepository";
import ReportService from "../services/implementation/reportService";

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const reportService = new ReportService();
const internalUserController = new InternalUserController(internalUserService, reportService);

/**
 * @swagger
 * /internal/reports:
 *   get:
 *     summary: Get reports for review
 *     description: Retrieve reports for review. PR Officers can only retrieve pending approval reports. Future - Technical officers will see reports assigned to them.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by report status (PR officers can only retrieve pending reports)
 *         example: "Pending Approval"
 *     responses:
 *       200:
 *         description: List of reports matching the status filter
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReportDTO'
 *       400:
 *         description: Error retrieving reports
 *       401:
 *         description: Unauthorized
 */
router.get("/reports", internalUserController.getReports.bind(internalUserController));

/**
 * @swagger
 * /internal/reports/{id}:
 *   patch:
 *     summary: Review and update report (approve/reject/change category)
 *     description: Allows PR officers to review reports, approve/reject them, optionally correct category, and provide explanation. If approved (Assigned status), system auto-assigns to an available officer with the appropriate role for that category.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - explanation
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending Approval, Assigned, In Progress, Suspended, Rejected, Resolved]
 *                 example: "Assigned"
 *               category:
 *                 type: string
 *                 description: Optional - correct category if citizen chose the wrong one
 *                 example: "Roads and Urban Furnishings"
 *               explanation:
 *                 type: string
 *                 example: "Report approved and assigned for processing."
 *     responses:
 *       200:
 *         description: Report updated successfully with assignment details if approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportDTO'
 *       400:
 *         description: Validation error or missing fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.patch("/reports/:id", internalUserController.updateReportStatus.bind(internalUserController));

/**
 * @swagger
 * /internal/reports/assigned:
 *   get:
 *     summary: Get reports assigned to the authenticated technical staff officer
 *     description:
 *       Returns only the reports assigned to the internal technical officer who is making the request.
 *       PR officers cannot use this endpoint.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: List of reports assigned to this officer
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReportDTO'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    "/reports/assigned",
    internalUserController.getReportsForTechnicalOfficer.bind(internalUserController)
);

/**
 * @swagger
 * /internal/reports/by-office:
 *   get:
 *     summary: Get all reports related to the internal user's office
 *     description:
 *       Returns all reports whose categories belong to the office of the authenticated internal staff member.
 *       PR Officers cannot use this endpoint.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: List of reports for the user's office
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReportDTO'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (PR Officers cannot access)
 */
router.get(
    "/reports/by-office",
    internalUserController.getReportsByOffice.bind(internalUserController)
);

export default router;
