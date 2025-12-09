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

// /**
//  * @swagger
//  * /internal/reports:
//  *   get:
//  *     summary: Get reports for review
//  *     description: Retrieve reports for review. PR Officers can only retrieve pending approval reports. Future - Technical officers will see reports assigned to them.
//  *     tags: [Internal]
//  *     security:
//  *       - internalPassword: []
//  *     parameters:
//  *       - in: query
//  *         name: status
//  *         schema:
//  *           type: string
//  *         description: Filter by report status (PR officers can only retrieve pending reports)
//  *         example: "Pending Approval"
//  *     responses:
//  *       200:
//  *         description: List of reports matching the status filter
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/ReportDTO'
//  *       400:
//  *         description: Error retrieving reports
//  *       401:
//  *         description: Unauthorized
//  */
// router.get("/reports", internalUserController.getReports.bind(internalUserController));
//
// /**
//  * @swagger
//  * /internal/reports/{id}:
//  *   patch:
//  *     summary: Review and update report (approve/reject/change category)
//  *     description: Allows PR officers to review a report, approve/reject it, optionally correct category, and provide explanation.
//  *     tags: [Internal]
//  *     security:
//  *       - internalPassword: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: Report ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - status
//  *               - explanation
//  *             properties:
//  *               status:
//  *                 type: string
//  *                 enum: [Pending Approval, Assigned, In Progress, Suspended, Rejected, Resolved]
//  *                 example: "Assigned"
//  *               categoryId:
//  *                 type: integer
//  *                 description: Optional corrected category ID
//  *                 example: 3
//  *               explanation:
//  *                 type: string
//  *                 example: "Report approved and assigned for processing."
//  *     responses:
//  *       200:
//  *         description: Update successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 message:
//  *                   type: string
//  *                 status:
//  *                   type: string
//  *                 assignedTo:
//  *                   type: string
//  *       404:
//  *         description: Report not found
//  *       400:
//  *         description: Validation error
//  */
// router.patch("/reports/:id", internalUserController.updateReportStatus.bind(internalUserController));
//
// /**
//  * @swagger
//  * /internal/reports/assigned:
//  *   get:
//  *     summary: Get reports assigned to the authenticated technical staff officer
//  *     description:
//  *       Returns only the reports assigned to the internal technical officer who is making the request.
//  *       PR officers cannot use this endpoint.
//  *     tags: [Internal]
//  *     security:
//  *       - internalPassword: []
//  *     responses:
//  *       200:
//  *         description: List of reports assigned to this officer
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/ReportDTO'
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden
//  */
// router.get(
//     "/reports/assigned",
//     internalUserController.getReportsForTechnicalOfficer.bind(internalUserController)
// );
//
// /**
//  * @swagger
//  * /internal/reports/by-office:
//  *   get:
//  *     summary: Get all reports related to the internal user's office
//  *     description:
//  *       Returns all reports whose categories belong to the office of the authenticated internal staff member.
//  *       PR Officers cannot use this endpoint.
//  *     tags: [Internal]
//  *     security:
//  *       - internalPassword: []
//  *     responses:
//  *       200:
//  *         description: List of reports for the user's office
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/ReportDTO'
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden (PR Officers cannot access)
//  */
// router.get(
//     "/reports/by-office",
//     internalUserController.getReportsByOffice.bind(internalUserController)
// );
//
// export default router;
// ====================== INTERNAL ENDPOINTS SWAGGER ======================

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     InternalReportUpdateResponseDTO:
 *       type: object
 *       required:
 *         - message
 *         - reportId
 *         - status
 *       properties:
 *         message:
 *           type: string
 *           example: "Report updated successfully"
 *         reportId:
 *           type: integer
 *           example: 1
 *         status:
 *           type: string
 *           example: "Assigned"
 *         assignedTo:
 *           type: string
 *           nullable: true
 *           example: "Andrea Romano"
 */

/**
 * @swagger
 * /internal/reports:
 *   get:
 *     summary: Get reports for review
 *     description: Retrieve reports for PR officers (pending reports) or technical officers (assigned reports).
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by report status
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
 *     description: Allows PR officers to review a report, approve or reject it, correct the category, and add explanation.
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
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 description: Optional corrected category ID
 *                 example: 3
 *               explanation:
 *                 type: string
 *                 example: "Report approved and assigned for processing."
 *     responses:
 *       200:
 *         description: Update successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalReportUpdateResponseDTO'
 *       404:
 *         description: Report not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch("/reports/:id", internalUserController.updateReportStatus.bind(internalUserController));

/**
 * @swagger
 * /internal/reports/{id}/delegate:
 *   patch:
 *     summary: Delegate a report to an external company
 *     description: Allows technical officers to delegate a report assigned to them whenever they are not able to process it. They choose a company that handles the category of the report from a list.
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
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 5
 *                 description: ID of the external company to delegate the report to
 *     responses:
 *       200:
 *         description: Delegated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignedTo:
 *                   type: integer
 *                   example: 12
 *                 message:
 *                   type: string
 *                   example: "Report delegated successfully to maintainer Francesco Magetti from company Manital"
 *       404:
 *         description: Report not found
 *       403:
 *         description: Forbidden - Only the currently assigned officer can delegate this report
 *       400:
 *         description: Validation error
 */
router.patch("/reports/:id/delegate", internalUserController.delegateReport.bind(internalUserController));

/**
 * @swagger
 * /internal/reports/assigned:
 *   get:
 *     summary: Get reports assigned to the authenticated technical staff officer
 *     description: Only technical officers can retrieve reports assigned specifically to them.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: Reports assigned to this officer
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
 *     description: Technical officers can retrieve all reports belonging to their assigned office.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: List of reports for this office
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
    "/reports/by-office",
    internalUserController.getReportsByOffice.bind(internalUserController)
);

export default router;
