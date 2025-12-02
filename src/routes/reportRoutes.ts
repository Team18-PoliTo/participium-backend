import { Router } from "express";
import ReportController from "../controllers/reportController";
import ReportService from "../services/implementation/reportService";
import { ReportRepository } from "../repositories/implementation/ReportRepository";

const router = Router();

// Dependency Injection Setup
const reportRepository = new ReportRepository();
const reportService = new ReportService(reportRepository);
const reportController = new ReportController(reportService);

// DTOs
/**
 * @swagger
 * components:
 *   schemas:
 *     ReportDTO:
 *       type: object
 *       required:
 *         - id
 *         - citizenId
 *         - title
 *         - description
 *         - category
 *         - photos
 *         - createdAt
 *         - location
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         citizenId:
 *           type: integer
 *           example: 123
 *         title:
 *           type: string
 *           example: Pothole in the street
 *         description:
 *           type: string
 *           example: Large pothole near my house
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             name:
 *               type: string
 *               example: Roads and Urban Furnishings
 *             description:
 *               type: string
 *               example: Issues related to roads and urban furniture
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *             example: https://minio.example.com/reports/123/photo1.png?signature=abc123
 *           description: Pre-signed URLs to report photos (valid for 7 days)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-11-11T21:00:00Z
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *               example: 45.4642
 *             longitude:
 *               type: number
 *               example: 9.1900
 *     CreateReportRequestDTO:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - categoryId
 *         - photoIds
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           example: "Broken streetlight"
 *         description:
 *           type: string
 *           example: "The streetlight in front of my house has been out for 3 days"
 *         categoryId:
 *           type: integer
 *           example: 1
 *           description: ID of the category (obtained from GET /api/categories)
 *         photoIds:
 *           type: array
 *           minItems: 1
 *           maxItems: 3
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *           description: Array of file IDs from temporary uploads (obtained from POST /api/files/upload)
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
 *           example: [
 *             { "latitude": 45.4650, "longitude": 9.1890 },
 *             { "latitude": 20.463, "longitude": 15.1910 },
 *           ]
 *
 */

/**
 * @swagger
 * /citizens/reports:
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
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - categoryId
 *               - photoIds
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: Pothole in the street
 *               description:
 *                 type: string
 *                 example: Large pothole near my house
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the category (obtained from GET /api/categories)
 *               photoIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *                 description: Array of file IDs from temporary uploads (obtained from POST /api/files/upload)
 *               location:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 45.4642
 *                   longitude:
 *                     type: number
 *                     example: 9.1900
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportDTO'
 *       400:
 *         description: Validation error (e.g., invalid categoryId, photoIds not found or expired, missing required fields)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

router.post("/", reportController.create.bind(reportController));

/**
 * @swagger
 * /citizens/reports/map:
 *   post:
 *     summary: Get assigned summary of specific reports within specified map area
 *     tags: [Citizens]
 *     security:
 *       - citizenPassword: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetAssignedReportsForMapRequestDTO'
 *     responses:
 *       200:
 *         description: List of reports within the specified map area
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   citizenName:
 *                     type: string
 *                     example: Marco
 *                   citizenLastName:
 *                     type: string
 *                     example: Rossi
 *                   title:
 *                     type: string
 *                     example: Pothole in the street
 *                   status:
 *                     type: string
 *                     example: In progress
 *                   description:
 *                     type: string
 *                     example: Large pothole near my house
 *                   category:
 *                     type: object
 *                     description: Category info of the report
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Roads and Urban Furnishings
 *                       description:
 *                         type: string
 *                         example: Issues related to roads and urban furniture
 *                   location:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         example: 45.4642
 *                       longitude:
 *                         type: number
 *                         example: 9.1900
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/map",
  reportController.getAssignedReportsInMap.bind(reportController)
);

/**
 * @swagger
 * /citizens/reports/getById/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Citizens]
 *     security:
 *       - citizenPassword: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The report ID
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportDTO'
 *       400:
 *         description: Invalid report ID
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/getById/:id", reportController.getById.bind(reportController));

/**
 * @swagger
 * /citizens/reports/myReports:
 *   get:
 *     summary: Get all reports created by the authenticated citizen
 *     tags: [Citizens]
 *     security:
 *       - citizenPassword: []
 *     description: Returns a list of all reports created by the current citizen.
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
router.get("/myReports", reportController.getMyReports.bind(reportController));

export default router;
