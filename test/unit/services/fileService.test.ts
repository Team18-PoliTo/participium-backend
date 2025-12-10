import "multer";

jest.mock("../../../src/services/MinIoService", () => ({
  __esModule: true,
  default: {
    uploadFile: jest.fn(),
    fileExists: jest.fn(),
    copyFile: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

jest.mock("../../../src/repositories/implementation/TempFileRepository");


import TempFileRepository from "../../../src/repositories/implementation/TempFileRepository";
import TempFileDAO from "../../../src/models/dao/TempFileDAO";

describe("FileService", () => {
  let FileService: any;
  let MinIoService: any;
  let mockTempRepo: jest.Mocked<TempFileRepository>;

  beforeAll(() => {
    jest.resetModules();
    
    MinIoService = require("../../../src/services/MinIoService").default;
    const FileServiceModule = require("../../../src/services/FileService");
    FileService = FileServiceModule.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTempRepo = new TempFileRepository() as jest.Mocked<TempFileRepository>;
    
    FileService.tempFileRepository = mockTempRepo;

    MinIoService.uploadFile.mockResolvedValue("temp/path");
    MinIoService.fileExists.mockResolvedValue(true);
    MinIoService.copyFile.mockResolvedValue(undefined);
    MinIoService.deleteFile.mockResolvedValue(undefined);
  });

  describe("uploadTemp", () => {
    const mockFile = {
      originalname: "test.png",
      mimetype: "image/png",
      size: 1024,
      buffer: Buffer.from("data"),
    } as Express.Multer.File;

    it("should upload file to MinIO and save metadata", async () => {
      mockTempRepo.create.mockResolvedValue({
        id: 1,
        fileId: "uuid",
        originalName: "test.png",
        size: 1024,
        mimeType: "image/png",
        tempPath: "temp/path",
        expiresAt: new Date(Date.now() + 10000),
      } as any);

      const result = await FileService.uploadTemp(mockFile, "report");

      expect(MinIoService.uploadFile).toHaveBeenCalled();
      expect(mockTempRepo.create).toHaveBeenCalled();
      expect(result.fileId).toBe("uuid");
    });

    it("should throw error for invalid mime type", async () => {
      const badFile = { ...mockFile, mimetype: "application/exe" };
      await expect(FileService.uploadTemp(badFile, "report")).rejects.toThrow(
        "not allowed"
      );
    });

    it("should throw error for size limit", async () => {
      const bigFile = { ...mockFile, size: 10 * 1024 * 1024 };
      await expect(FileService.uploadTemp(bigFile, "report")).rejects.toThrow(
        "exceeds maximum allowed size"
      );
    });

    it("should throw if extension does not match mime type", async () => {
        const mismatch = { ...mockFile, originalname: "test.jpg", mimetype: "image/png" };
        await expect(FileService.uploadTemp(mismatch, "report")).rejects.toThrow(
            "File extension does not match file type"
        );
    });
  });

  describe("validateTempFiles", () => {
    it("should return files if they exist and are valid", async () => {
      const fileId = "uuid-1";
      const tempFile = {
        fileId,
        tempPath: "temp/path",
        expiresAt: new Date(Date.now() + 10000),
      } as TempFileDAO;

      mockTempRepo.findByFileId.mockResolvedValue(tempFile);
      MinIoService.fileExists.mockResolvedValue(true);

      const result = await FileService.validateTempFiles([fileId]);

      expect(result).toEqual([tempFile]);
    });

    it("should throw if file not found in DB", async () => {
        mockTempRepo.findByFileId.mockResolvedValue(null);
        await expect(FileService.validateTempFiles(["missing"])).rejects.toThrow("not found");
    });

    it("should throw if file expired", async () => {
      const tempFile = {
        fileId: "1",
        expiresAt: new Date(Date.now() - 1000),
      } as TempFileDAO;

      mockTempRepo.findByFileId.mockResolvedValue(tempFile);

      await expect(FileService.validateTempFiles(["1"])).rejects.toThrow(
        "has expired"
      );
    });

    it("should throw if file missing in MinIO", async () => {
      const tempFile = {
        fileId: "1",
        tempPath: "path",
        expiresAt: new Date(Date.now() + 10000),
      } as TempFileDAO;

      mockTempRepo.findByFileId.mockResolvedValue(tempFile);
      MinIoService.fileExists.mockResolvedValue(false);

      await expect(FileService.validateTempFiles(["1"])).rejects.toThrow(
        "not found in storage"
      );
    });
  });
  
  describe("moveToPermanent", () => {
    it("should copy file, delete temp, and remove DB record", async () => {
      const tempFile = {
        id: 1,
        fileId: "uid",
        tempPath: "temp/1",
      } as TempFileDAO;

      mockTempRepo.findByFileId.mockResolvedValue(tempFile);

      const path = await FileService.moveToPermanent("uid", "perm/1");

      expect(MinIoService.copyFile).toHaveBeenCalledWith("temp/1", "perm/1");
      // MINIO_BUCKET from environment (defaults to "reports" but may be "uploads" in test env)
      const expectedBucket = process.env.MINIO_BUCKET || "reports";
      expect(MinIoService.deleteFile).toHaveBeenCalledWith(expectedBucket, "temp/1");
      expect(mockTempRepo.delete).toHaveBeenCalledWith(1);
      expect(path).toBe("perm/1");
    });

    it("should throw if file not found", async () => {
        mockTempRepo.findByFileId.mockResolvedValue(null);
        await expect(FileService.moveToPermanent("uid", "perm")).rejects.toThrow("not found");
    });
  });

  describe("moveMultipleToPermanent", () => {
      it("should move all files", async () => {
          const files = [{ fileId: "1", permanentPath: "perm/1" }, { fileId: "2", permanentPath: "perm/2" }];
          mockTempRepo.findByFileId.mockImplementation(async (id) => ({ id: Number(id), tempPath: `temp/${id}` } as any));
          
          const paths = await FileService.moveMultipleToPermanent(files);
          expect(paths).toEqual(["perm/1", "perm/2"]);
          expect(MinIoService.copyFile).toHaveBeenCalledTimes(2);
      });

      it("should rollback if one fails", async () => {
        const files = [{ fileId: "1", permanentPath: "perm/1" }, { fileId: "2", permanentPath: "perm/2" }];
        
        mockTempRepo.findByFileId.mockResolvedValueOnce({ id: 1, tempPath: "temp/1" } as any);
        mockTempRepo.findByFileId.mockResolvedValueOnce(null); 

        await expect(FileService.moveMultipleToPermanent(files)).rejects.toThrow("not found");
        
        // MINIO_BUCKET from environment (defaults to "reports" but may be "uploads" in test env)
        const expectedBucket = process.env.MINIO_BUCKET || "reports";
        expect(MinIoService.deleteFile).toHaveBeenCalledWith(expectedBucket, "perm/1");
      });
  });

  describe("deleteTempFile", () => {
      it("should delete from MinIO and DB", async () => {
          mockTempRepo.findByFileId.mockResolvedValue({ id: 1, tempPath: "p" } as any);
          await FileService.deleteTempFile("1");
          expect(MinIoService.deleteFile).toHaveBeenCalled();
          expect(mockTempRepo.delete).toHaveBeenCalledWith(1);
      });

      it("should handle MinIO deletion errors", async () => {
        mockTempRepo.findByFileId.mockResolvedValue({ id: 1, tempPath: "p" } as any);
        MinIoService.deleteFile.mockRejectedValue(new Error("MinIO error"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await FileService.deleteTempFile("1");
        
        expect(mockTempRepo.delete).toHaveBeenCalledWith(1);
        expect(consoleSpy).toHaveBeenCalled();
      });

      it("should do nothing if file not found", async () => {
          mockTempRepo.findByFileId.mockResolvedValue(null);
          await FileService.deleteTempFile("1");
          expect(MinIoService.deleteFile).not.toHaveBeenCalled();
      });
  });

  describe("cleanupExpiredTempFiles", () => {
      it("should clean up expired files", async () => {
          const files = [
              { id: 1, tempPath: "t1" },
              { id: 2, tempPath: "t2" }
          ] as any[];
          mockTempRepo.findExpired.mockResolvedValue(files);

          const count = await FileService.cleanupExpiredTempFiles();
          expect(count).toBe(2);
          expect(MinIoService.deleteFile).toHaveBeenCalledTimes(2); // 2 files * 2 buckets trial
          expect(mockTempRepo.delete).toHaveBeenCalledTimes(2);
      });

      it("should handle errors during cleanup", async () => {
        const files = [{ id: 1, tempPath: "t1" }] as any[];
        mockTempRepo.findExpired.mockResolvedValue(files);
        MinIoService.deleteFile.mockRejectedValue(new Error("Fail"));
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();
        
        await FileService.cleanupExpiredTempFiles();
        expect(consoleSpy).toHaveBeenCalled();
      });
  });
});