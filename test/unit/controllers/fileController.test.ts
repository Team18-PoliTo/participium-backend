import "multer";
import { Request, Response, NextFunction } from "express";
import { EntityMetadataNotFoundError } from "typeorm";

// Define mocks
const mockUploadTemp = jest.fn();
const mockDeleteTempFile = jest.fn();

// Mock the service path
jest.mock("../../../src/services/FileService", () => ({
  __esModule: true,
  default: {
    uploadTemp: mockUploadTemp,
    deleteTempFile: mockDeleteTempFile,
  },
}));

describe("FileController", () => {
  let FileController: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeAll(() => {
    // Clear cache to ensure we import the controller using the MOCKED service
    jest.resetModules();
    FileController = require("../../../src/controllers/fileController").default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // FIX: Initialize body to prevent "Cannot read property 'type' of undefined"
    req = {
        body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("uploadTemp", () => {
    it("should return 400 if no file provided", async () => {
      await FileController.uploadTemp(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "No file provided" });
    });

    it("should handle validation errors (400)", async () => {
      req.file = { originalname: "bad.exe" } as Express.Multer.File;
      
      const error = new Error("File type undefined is not allowed. Allowed types: ...");
      mockUploadTemp.mockRejectedValue(error);

      await FileController.uploadTemp(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: error.message });
    });

    it("should handle max size errors (400)", async () => {
        req.file = { originalname: "big.png" } as Express.Multer.File;
        const error = new Error("File size exceeds maximum");
        mockUploadTemp.mockRejectedValue(error);
  
        await FileController.uploadTemp(req as Request, res as Response, next);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: error.message });
    });

    it("should return 500 for unexpected errors", async () => {
        req.file = { originalname: "ok.png" } as Express.Multer.File;
        const error = new Error("Database connection failed");
        mockUploadTemp.mockRejectedValue(error);
  
        await FileController.uploadTemp(req as Request, res as Response, next);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Failed to upload file" });
        expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteTempFile", () => {
    it("should return 204 on success", async () => {
        req.params = { fileId: "123" };
        mockDeleteTempFile.mockResolvedValue(undefined);

        await FileController.deleteTempFile(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.send).toHaveBeenCalled();
    });

    it("should return 400 if fileId missing", async () => {
        req.params = {};
        await FileController.deleteTempFile(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "File ID is required" });
    });

    it("should return 500 on service error", async () => {
      req.params = { fileId: "123" };
      const err = new EntityMetadataNotFoundError("TempFileDAO");
      mockDeleteTempFile.mockRejectedValue(err);

      await FileController.deleteTempFile(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});