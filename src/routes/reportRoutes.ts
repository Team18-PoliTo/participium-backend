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
 *           example: "photo1.png"
 *         mimetype:
 *           type: string
 *           example: "image/png"
 *         size:
 *           type: integer
 *           description: Size in bytes
 *           example: 102400
 *         data:
 *           type: string
 *           format: byte
 *           description: Base64 encoded file content
 *
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
 * /reports:
 *   post:
 *     summary: Create a new report
 *     tags:
 *       - Reports
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportRequestDTO'
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

router.post("/", reportController.create.bind(reportController));

export default router;
