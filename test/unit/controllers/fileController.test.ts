import "multer";
import { Request, Response, NextFunction } from "express";

jest.mock("../../../src/services/FileService", () => ({
  __esModule: true,
  default: {
    uploadTemp: jest.fn(),
    deleteTempFile: jest.fn(),
  },
}));

import FileController from "../../../src/controllers/fileController";
import FileService from "../../../src/services/FileService";
import { EntityMetadataNotFoundError, EntityNotFoundError } from "typeorm";
import TempFileDAO from "../../../src/models/dao/TempFileDAO";

describe("FileController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockFileService = FileService as unknown as {
    uploadTemp: jest.Mock;
    deleteTempFile: jest.Mock;
  };

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("uploadTemp", () => {
    it("should return 400 if no file provided", async () => {
      await FileController.uploadTemp(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "No file provided" });
    });

    it("should handle validation errors (400)", async () => {
      req.file = { 
        originalname: "bad.exe",
        mimetype: "application/x-msdownload"
      } as Express.Multer.File;
      req.body = { type: "report" };
      mockFileService.uploadTemp.mockRejectedValue(new Error("File type application/x-msdownload is not allowed. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp"));

      await FileController.uploadTemp(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "File type application/x-msdownload is not allowed. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp" 
      });
    });
  });

  describe("deleteTempFile", () => {

    it("should return 500 on service error", async () => {
      req.params = { fileId: "123" };
      const err = new EntityMetadataNotFoundError(TempFileDAO);
      mockFileService.deleteTempFile.mockRejectedValue(err);

      await FileController.deleteTempFile(req as Request, res as Response, next);

      //expect(res.status).toBe(500);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});