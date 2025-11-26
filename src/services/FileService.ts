import { v4 as uuidv4 } from "uuid";
import MinIoService from "./MinIoService";
import TempFileRepository from "../repositories/implementation/TempFileRepository";
import TempFileDAO from "../models/dao/TempFileDAO";
import {MINIO_BUCKET, PROFILE_BUCKET} from "../config/minioClient";

export interface UploadedFileDTO {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  tempPath: string;
  expiresAt: string; // ISO string format (Date converted to string for JSON response)
}

const VALID_TYPES = ["report", "profile"] as const;
type FileType = typeof VALID_TYPES[number];

class FileService {
  private tempFileRepository: TempFileRepository;
  
  // Allowed MIME types for uploads
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  // Max file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  
  // Temp file expiry: 24 hours
  private readonly TEMP_FILE_EXPIRY_HOURS = 24;

  constructor(tempFileRepository: TempFileRepository = new TempFileRepository()) {
    this.tempFileRepository = tempFileRepository;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Check file extension matches MIME type
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const mimeExtension = file.mimetype.split('/')[1];
    if (extension && extension !== mimeExtension && !(extension === 'jpg' && mimeExtension === 'jpeg')) {
      throw new Error('File extension does not match file type');
    }
  }

  /**
   * Upload file to temporary storage
   * @param file - The file to upload (from multer)
   * @param type
   * @returns Metadata about the uploaded temp file
   */
  async uploadTemp(file: Express.Multer.File, type: FileType): Promise<UploadedFileDTO> {
    // Validate file
    this.validateFile(file);

    const fileId = uuidv4();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const tempPath = `temp/${fileId}/${sanitizedFilename}`;

    const bucket = type === "report" ? MINIO_BUCKET : PROFILE_BUCKET;

    // Upload to MinIO
    await MinIoService.uploadFile(bucket, tempPath, file.buffer, file.mimetype);
    
    // Store metadata in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TEMP_FILE_EXPIRY_HOURS);
    
    const tempFile = await this.tempFileRepository.create({
      fileId,
      originalName: file.originalname,
      tempPath,
      size: file.size,
      mimeType: file.mimetype,
      expiresAt,
    });
    
    return {
      fileId: tempFile.fileId,
      filename: tempFile.originalName,
      size: tempFile.size,
      mimeType: tempFile.mimeType,
      tempPath: tempFile.tempPath,
      expiresAt: tempFile.expiresAt.toISOString(), // Convert Date to ISO string for JSON response
    };
  }

  /**
   * Validate that temp files exist and are not expired
   * @param fileIds - Array of file IDs to validate
   * @returns Array of validated temp files
   */
  async validateTempFiles(fileIds: string[]): Promise<TempFileDAO[]> {
    const tempFiles: TempFileDAO[] = [];
    const now = new Date();

    for (const fileId of fileIds) {
      const tempFile = await this.tempFileRepository.findByFileId(fileId);
      
      if (!tempFile) {
        throw new Error(`Temp file with ID ${fileId} not found`);
      }
      
      if (tempFile.expiresAt < now) {
        throw new Error(`Temp file with ID ${fileId} has expired`);
      }

      // Verify file exists in MinIO
      const exists = await MinIoService.fileExists(tempFile.tempPath);
      if (!exists) {
        throw new Error(`Temp file with ID ${fileId} not found in storage`);
      }
      
      tempFiles.push(tempFile);
    }

    return tempFiles;
  }

  /**
   * Move temp file to permanent location
   * @param fileId - The temp file ID
   * @param permanentPath - The destination path in MinIO
   * @returns The permanent path
   */
  async moveToPermanent(fileId: string, permanentPath: string): Promise<string> {
    const tempFile = await this.tempFileRepository.findByFileId(fileId);
    
    if (!tempFile) {
      throw new Error(`Temp file with ID ${fileId} not found`);
    }
    
    // Copy from temp to permanent location
    await MinIoService.copyFile(tempFile.tempPath, permanentPath);
    
    // Delete temp file from MinIO
    await MinIoService.deleteFile(MINIO_BUCKET, tempFile.tempPath);
    
    // Delete temp file record from database
    await this.tempFileRepository.delete(tempFile.id);
    
    return permanentPath;
  }

  /**
   * Move multiple temp files to permanent locations (with rollback on failure)
   * @param moves - Array of {fileId, permanentPath} objects
   * @returns Array of permanent paths
   */
  async moveMultipleToPermanent(moves: Array<{fileId: string, permanentPath: string}>): Promise<string[]> {
    const movedPaths: string[] = [];
    
    try {
      for (const move of moves) {
        const permanentPath = await this.moveToPermanent(move.fileId, move.permanentPath);
        movedPaths.push(permanentPath);
      }
      return movedPaths;
    } catch (error) {
      // Rollback: delete any files that were successfully moved
      for (const path of movedPaths) {
        try {
          await MinIoService.deleteFile(MINIO_BUCKET,path);
        } catch (deleteError) {
          console.error(`Failed to rollback file ${path}:`, deleteError);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a temp file
   * @param fileId - The temp file ID to delete
   */
  async deleteTempFile(fileId: string): Promise<void> {
    const tempFile = await this.tempFileRepository.findByFileId(fileId);
    
    if (tempFile) {
      // Delete from MinIO
      try {
        await MinIoService.deleteFile(MINIO_BUCKET,tempFile.tempPath);
      } catch (error) {
        console.error(`Failed to delete file from MinIO: ${tempFile.tempPath}`, error);
      }
      
      // Delete from database
      await this.tempFileRepository.delete(tempFile.id);
    }
  }

  /**
   * Cleanup expired temp files (for cron job)
   * @returns Number of files cleaned up
   */
  async cleanupExpiredTempFiles(): Promise<number> {
    const expiredFiles = await this.tempFileRepository.findExpired();
    let cleanedCount = 0;

    for (const file of expiredFiles) {
      try {
        // Delete from MinIO
        await MinIoService.deleteFile(MINIO_BUCKET,file.tempPath);
        
        // Delete from database
        await this.tempFileRepository.delete(file.id);
        
        cleanedCount++;
        console.log(`Cleaned up expired temp file: ${file.tempPath}`);
      } catch (error) {
        console.error(`Failed to cleanup temp file ${file.tempPath}:`, error);
      }
    }

    return cleanedCount;
  }
}

export default new FileService();

