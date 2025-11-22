import { Router } from "express";
import ReportController from "../controllers/reportController";
import ReportService from "../services/implementation/reportService";
import { ReportRepository } from "../repositories/implementation/ReportRepository";
import CitizenController from "../controllers/citizenController";

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
 *           example: Roads and Urban Furnishings
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
 *               category:
 *                 type: string
 *                 example: Roads and Urban Furnishings
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
 *                   citizenId:
 *                     type: integer
 *                     example: 123
 *                   title:
 *                     type: string
 *                     example: Pothole in the street
 *                   description:
 *                     type: string
 *                     example: Large pothole near my house
 *                   location:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                         example: 45.4642
 *                       longitude:
 *                         type: number
 *                         example: 9.1900
 *             example:
 *               - id: 1
 *                 citizenId: 123
 *                 title: Pothole in the street
 *                 description: Large pothole near my house
 *                 location:
 *                   latitude: 45.4642
 *                   longitude: 9.1900
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 */
router.post(
  "/map",
  reportController.getAssignedReportsInMap.bind(reportController)
);

/**
 * @swagger
 * /citizens/reports/{id}:
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
router.get("/:id", reportController.getById.bind(reportController));

export default router;
