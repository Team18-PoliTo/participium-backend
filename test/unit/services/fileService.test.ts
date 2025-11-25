import "multer";
import FileService from "../../../src/services/FileService";
import TempFileRepository from "../../../src/repositories/implementation/TempFileRepository";
import MinIoService from "../../../src/services/MinIoService";
import TempFileDAO from "../../../src/models/dao/TempFileDAO";

// ✅ Mock modules
jest.mock("../../../src/services/MinIoService", () => ({
  uploadFile: jest.fn().mockResolvedValue("temp/path"),
  fileExists: jest.fn(),
  copyFile: jest.fn().mockResolvedValue(undefined),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/repositories/implementation/TempFileRepository");

describe("FileService", () => {
  let mockTempRepo: jest.Mocked<TempFileRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTempRepo = new TempFileRepository() as jest.Mocked<TempFileRepository>;

    // ✅ Inject mocked repo into service
    (FileService as any).tempFileRepository = mockTempRepo;
  });

  describe("uploadTemp", () => {
    const mockFile = {
      originalname: "test.png",
      mimetype: "image/png",
      size: 1024,
      buffer: Buffer.from("data"),
    } as Express.Multer.File;

    /*
    it("should upload file to MinIO and save metadata", async () => {
      mockTempRepo.create.mockResolvedValue({
        id: 1,
        tempPath: "temp/path",
        expiresAt: new Date(Date.now() + 10000),
      } as any);

      const result = await FileService.uploadTemp(mockFile);

      expect(MinIoService.uploadFile).toHaveBeenCalled();
      expect(mockTempRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: "test.png",
          size: 1024,
        })
      );
      expect(result.fileId).toBeDefined();
    }); 
    */

    it("should throw error for invalid mime type", async () => {
      const badFile = { ...mockFile, mimetype: "application/exe" };
      await expect(FileService.uploadTemp(badFile)).rejects.toThrow(
        "File type application/exe is not allowed"
      );
    });

    it("should throw error for size limit", async () => {
      const bigFile = { ...mockFile, size: 10 * 1024 * 1024 };
      await expect(FileService.uploadTemp(bigFile)).rejects.toThrow(
        "exceeds maximum allowed size"
      );
    });
  });

  describe("validateTempFiles", () => {
    /*
    it("should return files if they exist and are valid", async () => {
      const fileId = "uuid-1";
      const tempFile = {
        fileId,
        tempPath: "temp/path",
        expiresAt: new Date(Date.now() + 10000),
      } as TempFileDAO;

      mockTempRepo.findByFileId.mockResolvedValue(tempFile);
      (MinIoService.fileExists as jest.Mock).mockResolvedValue(true);

      const result = await FileService.validateTempFiles([fileId]);

      expect(result).toEqual([tempFile]);
    }); */

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
      (MinIoService.fileExists as jest.Mock).mockResolvedValue(false);

      await expect(FileService.validateTempFiles(["1"])).rejects.toThrow(
        "not found in storage"
      );
    });
  });
  
  /*
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
      expect(MinIoService.deleteFile).toHaveBeenCalledWith("temp/1");
      expect(mockTempRepo.delete).toHaveBeenCalledWith(1);
      expect(path).toBe("perm/1");
    });
  });
  */
});
