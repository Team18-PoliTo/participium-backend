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
 * @route   POST /api/files/upload
 * @desc    Upload a file to temporary storage
 * @access  Authenticated users (citizen or internal)
 */
router.post("/upload", upload.single("file"), fileController.uploadTemp);

/**
 * @route   DELETE /api/files/temp/:fileId
 * @desc    Delete a temporary file
 * @access  Authenticated users (citizen or internal)
 */
router.delete("/temp/:fileId", fileController.deleteTempFile);

export default router;

