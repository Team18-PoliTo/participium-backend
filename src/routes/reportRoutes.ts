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


router.get("/reports", reportController.getMyReports.bind(reportController));

export default router;
