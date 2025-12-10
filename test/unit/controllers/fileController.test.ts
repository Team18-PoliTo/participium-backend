import { Request, Response } from "express";

const mockUploadTemp = jest.fn();
const mockDeleteTempFile = jest.fn();

jest.mock("../../../src/services/FileService", () => ({
    __esModule: true,
    default: {
        uploadTemp: mockUploadTemp,
        deleteTempFile: mockDeleteTempFile,
    },
}));

const mockReqRes = () => {
    const req: Partial<Request> = { body: {}, params: {} };
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
};

const expectError = (res: any, status: number, message: string) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: message });
};

describe("FileController", () => {
    let controller: any;

    beforeAll(() => {
        jest.resetModules();
        controller = require("../../../src/controllers/fileController").default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("uploadTemp", () => {
        it("returns 400 if no file provided", async () => {
            const { req, res, next } = mockReqRes();
            await controller.uploadTemp(req, res, next);
            expectError(res, 400, "No file provided");
        });

        it("returns 400 on validation error", async () => {
            const { req, res, next } = mockReqRes();
            req.file = { originalname: "bad.exe" } as any;

            const err = new Error("File type .exe is not allowed");
            mockUploadTemp.mockRejectedValue(err);
            await controller.uploadTemp(req , res, next);

            expectError(res, 400, err.message);
        });

        it("returns 400 on max size exceeded", async () => {
            const { req, res, next } = mockReqRes();
            req.file = { originalname: "big.png" } as any;
            const err = new Error("File size exceeds maximum");
            mockUploadTemp.mockRejectedValue(err);
            await controller.uploadTemp(req, res, next);
            expectError(res, 400, err.message);
        });

        it("returns 500 on unexpected error", async () => {
            const { req, res, next } = mockReqRes();
            req.file = { originalname: "ok.png" } as any;

            const err = new Error("Database failed");
            mockUploadTemp.mockRejectedValue(err);

            await controller.uploadTemp(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to upload file" });
            expect(next).toHaveBeenCalledWith(err);
        });
    });

    describe("deleteTempFile", () => {
        it("returns 400 if fileId missing", async () => {
            const { req, res, next } = mockReqRes();
            await controller.deleteTempFile(req, res, next);
            expectError(res, 400, "File ID is required");
        });

        it("returns 204 on success", async () => {
            const { req, res, next } = mockReqRes();
            req.params = { fileId: "abc" };

            mockDeleteTempFile.mockResolvedValue(undefined);
            await controller.deleteTempFile(req, res , next);
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });
    });
});
