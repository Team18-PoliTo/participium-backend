import { ReportMapper } from "../../../src/mappers/ReportMapper";
import ReportDAO from "../../../src/models/dao/ReportDAO";
import MinIoService from "../../../src/services/MinIoService";
import { ReportStatus } from "../../../src/constants/ReportStatus";

// Mock MinIoService: Correctly mock the DEFAULT export
jest.mock("../../../src/services/MinIoService", () => ({
  __esModule: true, // This is crucial for mocking default exports
  default: {
    getPresignedUrl: jest.fn(),
  },
}));

describe("ReportMapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  /*
  it("toDTO should map all fields correctly and generate presigned URLs", async () => {
    (MinIoService.getPresignedUrl as jest.Mock).mockImplementation(async (key) => `http://minio/${key}`);

    const mockDate = new Date();
    const reportDAO = {
      id: 1,
      citizen: {
        id: 10,
        firstName: "John",
        lastName: "Doe",
      },
      title: "Test Report",
      description: "Description",
      category: {
        id: 5,
        name: "Roads",
        description: "Road issues",
      },
      photo1: "photos/p1.jpg",
      photo2: "photos/p2.jpg",
      photo3: null,
      createdAt: mockDate,
      location: '{"latitude": 45.0, "longitude": 9.0}',
      status: ReportStatus.PENDING_APPROVAL,
      explanation: null,
      assignedTo: {
        id: 99,
        email: "officer@city.com",
        firstName: "Officer",
        lastName: "Smith",
      },
    } as unknown as ReportDAO;

    const dto = await ReportMapper.toDTO(reportDAO);

    expect(dto.id).toBe(1);
    expect(dto.citizenId).toBe(10);
    expect(dto.citizenName).toBe("John");
    expect(dto.category.name).toBe("Roads");
    
    // Check photos
    expect(dto.photos).toHaveLength(2);
    expect(dto.photos).toContain("http://minio/photos/p1.jpg");
    expect(dto.photos).toContain("http://minio/photos/p2.jpg");
    expect(MinIoService.getPresignedUrl).toHaveBeenCalledTimes(2);

    // Check location parsing
    expect(dto.location).toEqual({ latitude: 45.0, longitude: 9.0 });

    // Check assignedTo
    expect(dto.assignedTo).toEqual({
      id: 99,
      email: "officer@city.com",
      firstName: "Officer",
      lastName: "Smith",
    });
  });
  */

  it("toDTO should handle null assignments and photos", async () => {
    const reportDAO = {
      id: 2,
      citizen: { id: 10, firstName: "Jane", lastName: "Doe" },
      category: { id: 1, name: "Waste" },
      title: "Report",
      description: "Desc",
      photo1: null,
      photo2: null,
      photo3: null,
      createdAt: new Date(),
      location: '{"latitude": 0, "longitude": 0}',
      status: ReportStatus.PENDING_APPROVAL,
      assignedTo: null,
    } as unknown as ReportDAO;

    const dto = await ReportMapper.toDTO(reportDAO);

    expect(dto.assignedTo).toBeNull();
    expect(dto.photos).toEqual([]);
    expect(MinIoService.getPresignedUrl).not.toHaveBeenCalled();
  });
});