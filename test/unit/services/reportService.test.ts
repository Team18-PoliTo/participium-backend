jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import ReportService from "../../../src/services/implementation/reportService";
import MinIoService from "../../../src/services/MinIoService";
import { v4 as uuidv4 } from "uuid";

describe("ReportService", () => {
  const citizen = { id: 10 } as any;
  const category = { id: 1, name: "Road", description: "Road issues" } as any;

  const baseReport = {
    id: 42,
    citizen,
    title: "Initial",
    description: "Initial desc",
    category,
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
      updateStatus: jest.fn().mockResolvedValue({ ...baseReport }),
    };
    const citizenRepository = {
      findById: jest.fn().mockResolvedValue(citizen),
    };
    const categoryRepository = {
      findByName: jest.fn().mockResolvedValue(category),
      findById: jest.fn().mockResolvedValue(category), // Fixed missing mock
    };
    const categoryRoleRepository = {
        findRoleByCategory: jest.fn(),
        findCategoriesByOffice: jest.fn(),
    }
    const internalUserRepository = {
        findByRoleId: jest.fn(),
        findById: jest.fn(),
        findByIdWithRoleAndOffice: jest.fn(),
        incrementActiveTasks: jest.fn(),
    }

    return {
      service: new ReportService(
          reportRepository as any,
          citizenRepository as any,
          categoryRepository as any,
          categoryRoleRepository as any,
          internalUserRepository as any
      ),
      reportRepository,
      citizenRepository,
      categoryRepository,
      categoryRoleRepository,
      internalUserRepository
    };
  };

  let uploadSpy: jest.SpyInstance;
  let validateTempFilesSpy: jest.SpyInstance;
  let moveMultipleToPermanentSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    uploadSpy = jest
        .spyOn(MinIoService, "uploadFile")
        .mockResolvedValue(undefined as any);
    (uuidv4 as jest.Mock).mockImplementation(() => "uuid");
    
    const FileService = require("../../../src/services/FileService").default;
    validateTempFilesSpy = jest.spyOn(FileService, "validateTempFiles").mockResolvedValue([
        { fileId: "1", originalName: "photo1.png" },
    ]);
    
    moveMultipleToPermanentSpy = jest.spyOn(FileService, "moveMultipleToPermanent").mockResolvedValue([
        "object/photo1.png"
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates report, uploads provided photos, and returns DTO", async () => {
    const { service, reportRepository, citizenRepository } = buildService();

    const result = await service.create(
        {
          title: "Broken light",
          description: "Lamp not working",
          categoryId: 1, // Use DTO compliant payload
          location: { latitude: 45, longitude: 9 },
          photoIds: ["1"]
        } as any,
        citizen.id
    );

    expect(citizenRepository.findById).toHaveBeenCalledWith(citizen.id);
    expect(reportRepository.create).toHaveBeenCalled();
    expect(reportRepository.update).toHaveBeenCalled();
    expect(validateTempFilesSpy).toHaveBeenCalledWith(["1"]);
    expect(moveMultipleToPermanentSpy).toHaveBeenCalled();
  });

  it("throws when citizen cannot be located", async () => {
    const { service, citizenRepository } = buildService();
    citizenRepository.findById.mockResolvedValue(null);

    await expect(
        service.create(
            {
              title: "Any",
              description: "Any",
              categoryId: 1,
              location: { latitude: 0, longitude: 0 },
              photoIds: ["1"]
            } as any,
            999
        )
    ).rejects.toThrow("Citizen not found");
  });

  it("throws when category cannot be located", async () => {
    const { service, categoryRepository } = buildService();
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
        service.create(
            {
              title: "Broken light",
              description: "Lamp not working",
              categoryId: 999,
              location: { latitude: 45, longitude: 9 },
              photoIds: ["1"]
            } as any,
            citizen.id
        )
    ).rejects.toThrow("Category not found with ID: 999");
  });
  
});
