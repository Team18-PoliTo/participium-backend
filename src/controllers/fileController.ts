import { Request, Response, NextFunction } from "express";
import FileService from "../services/FileService";

const VALID_TYPES = ["report", "profile"] as const;
type FileType = typeof VALID_TYPES[number];

class FileController {
  /**
   * Upload a file to temporary storage
   * POST /api/files/upload
   */
  async uploadTemp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      // Type is optional, defaults to "report" for backward compatibility
      const type = (req.body.type as FileType) || "report";

      if (!VALID_TYPES.includes(type)) {
        res.status(400).json({ error: `Invalid type. Allowed: ${VALID_TYPES.join(", ")}` });
        return;
      }

      const uploadedFile = await FileService.uploadTemp(req.file, type);

      res.status(201).json(uploadedFile);
    } catch (error: any) {
      if (
          error instanceof Error &&
          (
              error.message.includes("exceeds maximum") ||
              error.message.includes("not allowed") ||
              error.message.includes("does not match")
          )
      ) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Failed to upload file" });
      next(error);
    }
  }

  /**
   * Delete a temporary file
   * DELETE /api/files/temp/:fileId
   */
  async deleteTempFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({ error: "File ID is required" });
        return;
      }

      await FileService.deleteTempFile(fileId);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete temporary file" });
      next(error);
    }
  }
}

export default new FileController();


