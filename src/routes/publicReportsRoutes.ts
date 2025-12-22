import { Router } from "express";
import ReportController from "../controllers/reportController";
import ReportService from "../services/implementation/reportService";
import { ReportRepository } from "../repositories/implementation/ReportRepository";

const router = Router();

// DI
const reportRepository = new ReportRepository();
const reportService = new ReportService(reportRepository);
const reportController = new ReportController(reportService);

/**
 * @swagger
 * /reports/map:
 *   post:
 *     summary: Get public summary of reports within specified map area
 *     tags: [Public Reports]
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
 *                 $ref: '#/components/schemas/MapReportDTO'
 *       400:
 *         description: Validation error
 */
router.post(
  "/reports/map",
  reportController.getAssignedReportsInMap.bind(reportController)
);

/**
 * @swagger
 * /reports/getById/{id}:
 *   get:
 *     summary: Get public report by ID
 *     tags: [Public Reports]
 *     parameters:
 *       - in: path
 *         name: id
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
 */
router.get(
  "/reports/getById/:id",
  reportController.getById.bind(reportController)
);

export default router;
