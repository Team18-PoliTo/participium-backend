import { ReportMapper } from "../../../src/mappers/ReportMapper";
import ReportDAO from "../../../src/models/dao/ReportDAO";
import MinIoService from "../../../src/services/MinIoService";
import { ReportStatus } from "../../../src/constants/ReportStatus";

jest.mock("../../../src/services/MinIoService", () => {
  return {
    __esModule: true,
    default: {
      getPresignedUrl: jest.fn(async (key) => `http://minio/${key}`),
    },
  };
});

describe("ReportMapper.toDTO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should map all fields correctly and generate presigned URLs", async () => {
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

    expect(dto.photos).toHaveLength(2);
    expect(dto.photos[0]).toContain("photos/p1.jpg");
    expect(dto.photos[1]).toContain("photos/p2.jpg");

    expect(dto.location).toEqual({ latitude: 45.0, longitude: 9.0 });

    expect(dto.assignedTo).toEqual({
      id: 99,
      email: "officer@city.com",
      firstName: "Officer",
      lastName: "Smith",
    });
  });

  it("should handle null assignments and photos", async () => {
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

  // NEW TESTS
  describe("toDTOforMap", () => {
    it("should return a simplified object for map display", () => {
      const reportDAO = {
        id: 1,
        citizen: {
          firstName: "Mario",
          lastName: "Rossi",
        },
        title: "Pothole",
        status: "Assigned",
        description: "Big hole",
        location: '{"latitude": 45.0, "longitude": 9.0}',
        category: { id: 1, name: "Road" },
      } as any;

      const result = ReportMapper.toDTOforMap(reportDAO);

      expect(result).toEqual({
        id: 1,
        citizenName: "Mario",
        citizenLastName: "Rossi",
        title: "Pothole",
        status: "Assigned",
        description: "Big hole",
        location: { latitude: 45.0, longitude: 9.0 },
        category: { id: 1, name: "Road" },
      });
    });
  });
});
