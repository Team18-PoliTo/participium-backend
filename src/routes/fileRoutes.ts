import { Router } from "express";
import multer from "multer";
import fileController from "../controllers/fileController";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadedFileDTO:
 *       type: object
 *       required:
 *         - fileId
 *         - filename
 *         - size
 *         - mimeType
 *         - tempPath
 *         - expiresAt
 *         - type
 *       properties:
 *         fileId:
 *           type: string
 *           format: uuid
 *           example: "f3d8e7d2-1c4b-4b8c-9e2f-0c3a2c1b7a6d"
 *         filename:
 *           type: string
 *           example: "pothole.png"
 *         size:
 *           type: integer
 *           example: 204800
 *         mimeType:
 *           type: string
 *           example: "image/png"
 *         tempPath:
 *           type: string
 *           example: "temp/f3d8e7d2-1c4b-4b8c-9e2f-0c3a2c1b7a6d/pothole.png"
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           example: "2025-11-20T13:37:00.000Z"
 *         type:
 *           type: string
 *           enum: [report, profile]
 *           example: "report"
 */

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a file to temporary storage
 *     tags: [Files]
 *     security:
 *       - citizenPassword: []
 *       - internalPassword: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG/PNG/GIF/WebP) up to 5MB
 *               type:
 *                 type: string
 *                 enum: [report, profile]
 *                 description: File category
 *                 example: "profile"
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadedFileDTO'
 *       400:
 *         description: Validation error (missing file or invalid file type/size)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to upload file
 */
router.post("/upload", upload.single("file"), fileController.uploadTemp);

/**
 * @swagger
 * /files/temp/{fileId}:
 *   delete:
 *     summary: Delete a temporary file
 *     tags: [Files]
 *     security:
 *       - citizenPassword: []
 *       - internalPassword: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Temporary file ID obtained from the upload endpoint
 *     responses:
 *       204:
 *         description: File deleted successfully
 *       400:
 *         description: File ID missing or invalid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to delete temporary file
 */
router.delete("/temp/:fileId", fileController.deleteTempFile);

export default router;