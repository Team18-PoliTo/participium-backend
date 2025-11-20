// Clear module cache before setting up mocks
jest.resetModules();

// Mock modules BEFORE any imports - Jest hoists these automatically
jest.mock("uuid", () => ({
  v4: jest.fn()
}));

// Mock FileService BEFORE ReportService imports it
// CRITICAL: Mock must be set up before any module that imports FileService is loaded
jest.mock("../../../src/services/FileService", () => {
  // Return a mock object that matches the FileService interface
  const mockValidateTempFiles = jest.fn();
  const mockMoveMultipleToPermanent = jest.fn();
  
  return {
    __esModule: true,
    default: {
      validateTempFiles: mockValidateTempFiles,
      moveMultipleToPermanent: mockMoveMultipleToPermanent,
      uploadTemp: jest.fn(),
      deleteTempFile: jest.fn(),
      cleanupExpiredTempFiles: jest.fn(),
    },
  };
});

// Now import modules - the mocks will be used
import { v4 as uuidv4 } from "uuid";
import FileService from "../../../src/services/FileService";
import ReportService from "../../../src/services/implementation/reportService";
import MinIoService from "../../../src/services/MinIoService";

describe("ReportService", () => {
  const citizen = { id: 10 } as any;
  const category = { id: 1, name: "Road", description: "Road issues" } as any;
  const baseReport = {
    id: 42,
    citizen,
    title: "Initial",
    description: "Initial desc",
    category: category,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    location: JSON.stringify({ latitude: 0, longitude: 0 }),
    photo1: undefined,
    photo2: undefined,
    photo3: undefined,
  } as any;

  const buildService = () => {
    const reportRepository = {
      create: jest.fn().mockResolvedValue({ ...baseReport }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const citizenRepository = {
      findById: jest.fn().mockResolvedValue(citizen),
    };
    const categoryRepository = {
      findById: jest.fn().mockResolvedValue(category),
    };
    return {
      service: new ReportService(reportRepository as any, citizenRepository as any, categoryRepository as any),
      reportRepository,
      citizenRepository,
      categoryRepository,
    };
  };

  let presignedUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    presignedUrlSpy = jest.spyOn(MinIoService, "getPresignedUrl").mockImplementation((key: string) => 
      Promise.resolve(`https://minio.example.com/${key}?signature=mock`)
    );
    (uuidv4 as jest.Mock).mockImplementation(() => "uuid");
    
    // Configure FileService mock methods - access directly from mocked FileService
    (FileService.validateTempFiles as jest.Mock).mockResolvedValue([
      { id: 1, fileId: "file1", originalName: "photo1.png", tempPath: "temp/file1/photo1.png" },
      { id: 2, fileId: "file2", originalName: "photo2.png", tempPath: "temp/file2/photo2.png" },
      { id: 3, fileId: "file3", originalName: "photo3.png", tempPath: "temp/file3/photo3.png" },
    ]);
    
    (FileService.moveMultipleToPermanent as jest.Mock).mockResolvedValue([
      "reports/42/photo1_uuid.png",
      "reports/42/photo2_uuid.png",
      "reports/42/photo3_uuid.png",
    ]);
  });

  afterEach(() => {
    presignedUrlSpy.mockRestore();
  });

  it("creates report, uploads provided photos, and returns DTO", async () => {
    const { service, reportRepository, citizenRepository } = buildService();

    const result = await service.create({
      title: "Broken light",
      description: "Lamp not working",
      categoryId: 1,
      location: { latitude: 45, longitude: 9 },
      photoIds: ["file1", "file2", "file3"],
    } as any, citizen.id);

    expect(citizenRepository.findById).toHaveBeenCalledWith(citizen.id);
    expect(FileService.validateTempFiles).toHaveBeenCalledWith(["file1", "file2", "file3"]);
    expect(reportRepository.create).toHaveBeenCalled();
    expect(FileService.moveMultipleToPermanent).toHaveBeenCalled();
    expect(reportRepository.update).toHaveBeenCalled();

    const updatedReport = (reportRepository.update as jest.Mock).mock.calls[0][0];
    expect(updatedReport.photo1).toBe("reports/42/photo1_uuid.png");
    expect(updatedReport.photo2).toBe("reports/42/photo2_uuid.png");
    expect(updatedReport.photo3).toBe("reports/42/photo3_uuid.png");

    expect(result).toMatchObject({
      id: baseReport.id,
      citizenId: citizen.id,
      title: baseReport.title,
      category: baseReport.category,
      location: { latitude: 0, longitude: 0 },
    });
    // Photos are now presigned URLs
    expect(result.photos.length).toBe(3);
    result.photos.forEach((url: string) => {
      expect(url).toContain("https://minio.example.com/");
    });
  });

  it("handles single photo upload", async () => {
    (FileService.validateTempFiles as jest.Mock).mockResolvedValueOnce([
      { id: 1, fileId: "file1", originalName: "p1.png", tempPath: "temp/file1/p1.png" },
    ]);
    
    (FileService.moveMultipleToPermanent as jest.Mock).mockResolvedValueOnce([
      "reports/42/photo1_uuid.png",
    ]);
    
    const { service, reportRepository } = buildService();

    const payload = {
      title: "Pothole",
      description: "Huge one",
      categoryId: 1,
      location: { latitude: 1, longitude: 2 },
      photoIds: ["file1"],
    } as any;

    await service.create(payload, citizen.id);

    expect(FileService.validateTempFiles).toHaveBeenCalledWith(["file1"]);
    expect(FileService.moveMultipleToPermanent).toHaveBeenCalled();
    expect(reportRepository.update).toHaveBeenCalled();
    
    const updatedReport = (reportRepository.update as jest.Mock).mock.calls[0][0];
    expect(updatedReport.photo1).toBe("reports/42/photo1_uuid.png");
    expect(updatedReport.photo2).toBeUndefined();
    expect(updatedReport.photo3).toBeUndefined();
  });

  it("throws when citizen cannot be located", async () => {
    const { service, citizenRepository } = buildService();
    citizenRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({ 
        title: "Test",
        description: "Test",
        categoryId: 1,
        location: { latitude: 0, longitude: 0 },
        photoIds: ["file1"]
      } as any, 999)
    ).rejects.toThrow("Citizen not found");
  });
});
