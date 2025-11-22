import { Request, Response, NextFunction } from "express";
import FileService from "../services/FileService";

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

      const uploadedFile = await FileService.uploadTemp(req.file);
      
      res.status(201).json(uploadedFile);
    } catch (error) {
      if (error instanceof Error) {
        // Handle validation errors
        if (error.message.includes('exceeds maximum') || 
            error.message.includes('not allowed') || 
            error.message.includes('does not match')) {
          res.status(400).json({ error: error.message });
          return;
        }
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

