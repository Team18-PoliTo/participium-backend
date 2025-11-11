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
 *     BinaryFileDTO:
 *       type: object
 *       required:
 *         - filename
 *         - mimetype
 *         - size
 *         - data
 *       properties:
 *         filename:
 *           type: string
 *           example: pothole.png
 *         mimetype:
 *           type: string
 *           example: image/png
 *         size:
 *           type: integer
 *           example: 123456
 *         data:
 *           type: string
 *           format: byte
 *           description: Base64 encoded file content
 *     ReportDTO:
 *       type: object
 *       required:
 *         - id
 *         - citizenId
 *         - title
 *         - description
 *         - category
 *         - photos
 *         - binaryPhotos
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
 *           type: string
 *           example: Road Issue
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *             example: /reports/123/1/photo1.png
 *         binaryPhotos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BinaryFileDTO'
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
 *         - citizenId
 *         - category
 *         - binaryPhoto1
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           example: "Broken streetlight"
 *         description:
 *           type: string
 *           example: "The streetlight in front of my house has been out for 3 days"
 *         citizenId:
 *           type: integer
 *           example: 123
 *         category:
 *           type: string
 *           example: "Infrastructure"
 *         binaryPhoto1:
 *           $ref: '#/components/schemas/BinaryFileDTO'
 *         binaryPhoto2:
 *           $ref: '#/components/schemas/BinaryFileDTO'
 *           nullable: true
 *         binaryPhoto3:
 *           $ref: '#/components/schemas/BinaryFileDTO'
 *           nullable: true
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
 *               - citizenId
 *               - category
 *               - binaryPhoto1
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: Pothole in the street
 *               description:
 *                 type: string
 *                 example: Large pothole near my house
 *               citizenId:
 *                 type: integer
 *                 example: 123
 *               category:
 *                 type: string
 *                 example: Road Issue
 *               binaryPhoto1:
 *                 $ref: '#/components/schemas/BinaryFileDTO'
 *               binaryPhoto2:
 *                 $ref: '#/components/schemas/BinaryFileDTO'
 *               binaryPhoto3:
 *                 $ref: '#/components/schemas/BinaryFileDTO'
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
 *       200:
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

router.post("/", reportController.create.bind(reportController));

export default router;
