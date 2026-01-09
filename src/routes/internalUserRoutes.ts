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
const internalUserController = new InternalUserController(
  internalUserService,
  reportService
);

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
router.get(
  "/reports",
  internalUserController.getReports.bind(internalUserController)
);

/**
 * @swagger
 * /internal/reports/{id}:
 *   patch:
 *     summary: Update report status
 *     description: |
 *       Update the status of a report. Different users have different permissions:
 *
 *       **PR Officers:**
 *       - Can approve pending reports (set to "Assigned")
 *       - Can reject pending reports (set to "Rejected")
 *       - Can optionally correct the category before approval
 *
 *       **Technical Staff (Municipality):**
 *       - Can update assigned reports to "In Progress"
 *       - Can delegate reports to external companies
 *       - Can suspend or resolve reports they are working on
 *
 *       **External Maintainers:**
 *       - Can update delegated reports assigned to them
 *       - Can set status to "In Progress", "Suspended", or "Resolved"
 *       - Cannot change the report category
 *
 *       **Valid Status Transitions:**
 *       | From | To | Who |
 *       |------|-----|-----|
 *       | Pending Approval | Assigned | PR Officer |
 *       | Pending Approval | Rejected | PR Officer |
 *       | Assigned | In Progress | Assigned Staff |
 *       | Assigned | Delegated | Assigned Staff (via delegate endpoint) |
 *       | Delegated | In Progress | External Maintainer |
 *       | In Progress | Suspended | Assigned User |
 *       | In Progress | Resolved | Assigned User |
 *       | Suspended | In Progress | Assigned User |
 *       | Suspended | Resolved | Assigned User |
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
 *                 enum: [Pending Approval, Assigned, In Progress, Suspended, Rejected, Resolved, Delegated]
 *                 example: "In Progress"
 *                 description: |
 *                   The new status for the report. Must be a valid transition from the current status.
 *               categoryId:
 *                 type: integer
 *                 description: |
 *                   Optional corrected category ID. Only PR Officers can change this.
 *                   External maintainers cannot modify the category.
 *                 example: 3
 *               explanation:
 *                 type: string
 *                 description: Explanation for the status change (captured for audit trail)
 *                 example: "Starting work on this report."
 *     responses:
 *       200:
 *         description: Update successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Report updated successfully"
 *                 reportId:
 *                   type: integer
 *                   example: 42
 *                 status:
 *                   type: string
 *                   example: "In Progress"
 *                 assignedTo:
 *                   type: string
 *                   nullable: true
 *                   example: "Mario Rossi"
 *       400:
 *         description: |
 *           Validation error. Possible reasons:
 *           - Invalid status value
 *           - Invalid status transition
 *           - External maintainer trying to change category
 *       403:
 *         description: |
 *           Forbidden. Possible reasons:
 *           - User not assigned to this report
 *           - User role cannot perform this transition
 *       404:
 *         description: Report not found
 */
router.patch(
  "/reports/:id",
  internalUserController.updateReportStatus.bind(internalUserController)
);

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
router.patch(
  "/reports/:id/delegate",
  internalUserController.delegateReport.bind(internalUserController)
);

/**
 * @swagger
 * /internal/reports/assigned:
 *   get:
 *     summary: Get reports assigned to the authenticated user
 *     description: |
 *       Returns reports assigned to the current user.
 *       Works for both **technical staff** and **external maintainers**.
 *
 *       **For Technical Staff:**
 *       - Returns reports with status: Assigned, In Progress, Suspended, Delegated
 *       - Includes reports they have delegated (until reassigned)
 *
 *       **For External Maintainers:**
 *       - Returns reports delegated to them (status: Delegated, In Progress, Suspended)
 *       - These are reports that municipality staff delegated to their company
 *
 *       Use the optional `status` query parameter to filter by specific status.
 *     tags: [Internal]
 *     security:
 *       - internalPassword: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Assigned, In Progress, Suspended, Delegated, Resolved]
 *         required: false
 *         description: |
 *           Optional filter by report status.
 *           Common filters:
 *           - "Delegated" - External maintainers: see newly delegated reports
 *           - "In Progress" - See reports currently being worked on
 *           - "Suspended" - See paused reports
 *         example: "Delegated"
 *     responses:
 *       200:
 *         description: List of reports assigned to this user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReportDTO'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - PR Officers cannot access this endpoint
 */
router.get(
  "/reports/assigned",
  internalUserController.getReportsForTechnicalOfficer.bind(
    internalUserController
  )
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

/**
 * @swagger
 * /internal/reports/{id}/comments:
 *   get:
 *     summary: Get comments for a report (internal only)
 *     description: Returns all comments associated with a report. Only internal users can access this endpoint.
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
 *     responses:
 *       200:
 *         description: List of comments for the report
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   comment:
 *                     type: string
 *                   commentOwner_id:
 *                     type: integer
 *                   creation_date:
 *                     type: string
 *                     format: date-time
 *                   report_id:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only internal users
 *       404:
 *         description: Report not found
 */
router.get(
  "/reports/:id/comments",
  internalUserController.getReportComments.bind(internalUserController)
);

/**
 * @swagger
 * /internal/reports/{id}/comments:
 *   post:
 *     summary: Create a comment on a report (internal only)
 *     description: Allows internal users to add a comment to a report. The comment is associated with the authenticated user.
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
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: The comment text
 *                 example: "This issue has been reviewed and assigned to the maintenance team."
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 comment:
 *                   type: string
 *                 commentOwner_id:
 *                   type: integer
 *                 creation_date:
 *                   type: string
 *                   format: date-time
 *                 report_id:
 *                   type: integer
 *       400:
 *         description: Invalid request or empty comment
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only internal users
 *       404:
 *         description: Report or user not found
 */
router.post(
  "/reports/:id/comments",
  internalUserController.createReportComment.bind(internalUserController)
);

/**
 * @swagger
 * /internal/delegated-reports:
 *   get:
 *     summary: Get all reports delegated by the authenticated user
 *     description: Retrieve all reports that were delegated by the authenticated technical officer. Returns reports with all report fields plus a delegatedAt timestamp indicating when the delegation occurred. Only technical officers can access this endpoint.
 *     tags: [Internal Reports]
 *     security:
 *       - internalPassword: []
 *     responses:
 *       200:
 *         description: Successfully retrieved delegated reports
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/ReportDTO'
 *                   - type: object
 *                     properties:
 *                       delegatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp when the report was delegated
 *                         example: "2024-01-15T10:30:00Z"
 *       401:
 *         description: Unauthorized - Missing or invalid authentication token
 *       403:
 *         description: Forbidden - User is not an internal user or role does not have permission to delegate reports
 *       500:
 *         description: Internal server error
 */
router.get(
  "/delegated-reports",
  internalUserController.getDelegatedReports.bind(internalUserController)
);

export default router;
