import { Router } from "express";
import ReportController from "../controllers/reportController";
import ReportService from "../services/implementation/reportService";
import { ReportRepository } from "../repositories/implementation/ReportRepository";

const router = Router();

// Dependency Injection Setup
const reportRepository = new ReportRepository();
const reportService = new ReportService(reportRepository);
const reportController = new ReportController(reportService);

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     ReportDTO:
 *       type: object
 *       required:
 *         - id
 *         - isAnonymous
 *         - title
 *         - description
 *         - category
 *         - photos
 *         - createdAt
 *         - location
 *         - address
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *
 *         isAnonymous:
 *           type: boolean
 *           example: true
 *           description: Indicates whether the report was created anonymously
 *
 *         citizenId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *
 *         citizenName:
 *           type: string
 *           example: "Anonymous"
 *
 *         citizenLastName:
 *           type: string
 *           example: "Anonymous"
 *
 *         title:
 *           type: string
 *           example: "Gas coming out"
 *
 *         description:
 *           type: string
 *           example: "There is some gas coming out from the street."
 *
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             name:
 *               type: string
 *               example: "Sewer System"
 *             description:
 *               type: string
 *               example: "Sistema Fognario"
 *
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "http://localhost:9000/reports/photo1_xxx.jpg"
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-11-24T22:22:16.487Z"
 *
 *         location:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *               example: 45.0607297
 *             longitude:
 *               type: number
 *               example: 7.6579427
 *
 *         address:
 *           type: string
 *           nullable: true
 *           example: "Via Saverio Mercadante, 10154 Torino"
 *
 *         status:
 *           type: string
 *           example: "Pending Approval"
 *
 *         explanation:
 *           type: string
 *           nullable: true
 *           example: null
 *
 *         assignedTo:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             email:
 *               type: string
 *               example: "giovanni.ferrari@participium.com"
 *             firstName:
 *               type: string
 *               example: "Giovanni"
 *             lastName:
 *               type: string
 *               example: "Ferrari"
 *
 *
 *     MapReportDTO:
 *       type: object
 *       required:
 *         - id
 *         - citizenName
 *         - citizenLastName
 *         - title
 *         - status
 *         - description
 *         - category
 *         - location
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         citizenName:
 *           type: string
 *           example: Alex
 *         citizenLastName:
 *           type: string
 *           example: Morgan
 *         title:
 *           type: string
 *           example: Gas coming out
 *         status:
 *           type: string
 *           example: Pending Approval
 *         description:
 *           type: string
 *           example: There is some gas coming out from the street.
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *               example: 45.0607297
 *             longitude:
 *               type: number
 *               example: 7.6579427
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             name:
 *               type: string
 *               example: Sewer System
 *             description:
 *               type: string
 *               example: Sistema Fognario
 *
 *
 *     CreateReportRequestDTO:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - categoryId
 *         - photoIds
 *         - location
 *       properties:
 *         isAnonymous:
 *           type: boolean
 *           example: false
 *           description: If true, the report will be created anonymously
 *
 *         title:
 *           type: string
 *           example: "Broken streetlight"
 *
 *         description:
 *           type: string
 *           example: "The streetlight in front of my house has been out for 3 days"
 *
 *         categoryId:
 *           type: integer
 *           example: 1
 *
 *         photoIds:
 *           type: array
 *           minItems: 1
 *           maxItems: 3
 *           items:
 *             type: string
 *             format: uuid
 *           example:
 *             - "550e8400-e29b-41d4-a716-446655440000"
 *
 *         location:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *               example: 45.4642
 *             longitude:
 *               type: number
 *               example: 9.1900
 *
 *
 *     GetAssignedReportsForMapRequestDTO:
 *       type: object
 *       required:
 *         - corners
 *       properties:
 *         corners:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *           example:
 *             - latitude: 45.4650
 *               longitude: 9.1890
 *             - latitude: 45.4630
 *               longitude: 9.1910
 */

/**
 * @swagger
 * /citizens/report:
 *   post:
 *     summary: Create a new report
 *     tags: [Citizens]
 *     security:
 *        - citizenPassword: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportRequestDTO'
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportDTO'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/report", reportController.create.bind(reportController));

/**
 * @swagger
 * /citizens/reports/myReports:
 *   get:
 *     summary: Get all reports created by the authenticated citizen
 *     tags: [Citizens]
 *     security:
 *       - citizenPassword: []
 *     responses:
 *       200:
 *         description: List of citizen's reports
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
  "/reports/myReports",
  reportController.getMyReports.bind(reportController)
);

export default router;
