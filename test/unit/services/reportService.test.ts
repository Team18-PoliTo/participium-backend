jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
import ReportService from "../../../src/services/implementation/reportService";
import MinIoService from "../../../src/services/MinIoService";
import { v4 as uuidv4 } from "uuid";
import { ReportStatus } from "../../../src/constants/ReportStatus";

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
    location: JSON.stringify({ latitude: 20, longitude: 10 }),
    photo1: undefined,
    photo2: undefined,
    photo3: undefined,
    status: ReportStatus.PENDING_APPROVAL,
  } as any;

  const buildService = () => {
    const reportRepository = {
      create: jest.fn().mockResolvedValue({ ...baseReport }),
      update: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue({ ...baseReport }),
      findById: jest.fn().mockResolvedValue(baseReport),
      findByStatus: jest.fn().mockResolvedValue([baseReport]),
      findByUser: jest.fn().mockResolvedValue([baseReport]),
      findByAssignedStaff: jest.fn().mockResolvedValue([baseReport]),
      findByCategoryIds: jest.fn().mockResolvedValue([baseReport]),
      findAllApproved: jest.fn().mockResolvedValue([baseReport]),
    };
    const citizenRepository = {
      findById: jest.fn().mockResolvedValue(citizen),
    };
    const categoryRepository = {
      findByName: jest.fn().mockResolvedValue(category),
      findById: jest.fn().mockResolvedValue(category),
    };
    const categoryRoleRepository = {
      findRoleByCategory: jest.fn(),
      findCategoriesByOffice: jest.fn(),
    };
    const internalUserRepository = {
      findByRoleId: jest.fn(),
      findById: jest.fn(),
      findByIdWithRoleAndOffice: jest.fn(),
      incrementActiveTasks: jest.fn(),
    };

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
      internalUserRepository,
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
    validateTempFilesSpy = jest
      .spyOn(FileService, "validateTempFiles")
      .mockResolvedValue([{ fileId: "1", originalName: "photo1.png" }]);

    moveMultipleToPermanentSpy = jest
      .spyOn(FileService, "moveMultipleToPermanent")
      .mockResolvedValue(["object/photo1.png"]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("creates report, uploads provided photos, and returns DTO", async () => {
      const { service, reportRepository, citizenRepository } = buildService();

      const result = await service.create(
        {
          title: "Broken light",
          description: "Lamp not working",
          categoryId: 1,
          location: { latitude: 45, longitude: 9 },
          photoIds: ["1"],
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
            photoIds: ["1"],
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
            photoIds: ["1"],
          } as any,
          citizen.id
        )
      ).rejects.toThrow("Category not found with ID: 999");
    });

    it("throws when photo upload fails", async () => {
      const { service } = buildService();
      moveMultipleToPermanentSpy.mockRejectedValue(new Error("Upload failed"));

      await expect(
        service.create(
          {
            title: "Test",
            description: "Test",
            categoryId: 1,
            location: { latitude: 45, longitude: 9 },
            photoIds: ["1"],
          } as any,
          citizen.id
        )
      ).rejects.toThrow("Failed to process photo uploads. Please try again.");
    });
  });

  describe("getReportById", () => {
    it("should return a report if id exists", async () => {
      const { service, reportRepository } = buildService();
      const reportDAO = {
        id: 1,
        title: "Test",
        location: JSON.stringify({ latitude: 45.0, longitude: 9.0 }),
        category: { id: 1, name: "Test", description: "Test" },
        citizen: { id: 123, firstName: "Test", lastName: "Test" },
      };
      reportRepository.findById.mockResolvedValue(reportDAO);

      const result = await service.getReportById(1);
      expect(reportRepository.findById).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
    });

    it("should throw if report does not exist", async () => {
      const { service, reportRepository } = buildService();
      reportRepository.findById.mockResolvedValue(null);

      await expect(service.getReportById(99)).rejects.toThrow(
        "Report not found"
      );
    });
  });

  describe("getReportsByStatus", () => {
    it("should return reports with the specified status", async () => {
      const { service, reportRepository } = buildService();
      const reportsDAO = [
        {
          id: 1,
          title: "Test",
          status: "PENDING",
          location: JSON.stringify({ latitude: 45.0, longitude: 9.0 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
        },
      ];
      reportRepository.findByStatus.mockResolvedValue(reportsDAO);

      const result = await service.getReportsByStatus("PENDING");
      expect(reportRepository.findByStatus).toHaveBeenCalledWith("PENDING");
      expect(result).toHaveLength(1);
    });
  });

  describe("getAssignedReportsInMap", () => {
    it("should return reports within the specified map boundaries", async () => {
      const { service, reportRepository } = buildService();
      const reportsDAO = [
        {
          id: 1,
          title: "Report 1",
          location: JSON.stringify({ latitude: 45.5, longitude: 9.5 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
        {
          id: 2,
          title: "Report 2",
          location: JSON.stringify({ latitude: 46.0, longitude: 10.0 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
        {
          id: 3,
          title: "Report 3 - Outside",
          location: JSON.stringify({ latitude: 50.0, longitude: 15.0 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
      ];
      reportRepository.findAllApproved.mockResolvedValue(reportsDAO);

      const corners = [
        { latitude: 45.0, longitude: 9.0 },
        { latitude: 46.5, longitude: 10.5 },
      ];

      const result = await service.getAssignedReportsInMap(corners);

      expect(reportRepository.findAllApproved).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it("should return empty array when no reports are within boundaries", async () => {
      const { service, reportRepository } = buildService();
      const reportsDAO = [
        {
          id: 1,
          title: "Report Outside",
          location: JSON.stringify({ latitude: 50.0, longitude: 15.0 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
      ];
      reportRepository.findAllApproved.mockResolvedValue(reportsDAO);

      const corners = [
        { latitude: 45.0, longitude: 9.0 },
        { latitude: 46.0, longitude: 10.0 },
      ];

      const result = await service.getAssignedReportsInMap(corners);

      expect(result).toHaveLength(0);
    });
  });

  describe("updateReport", () => {
    it("should update and return the updated report", async () => {
      const { service, reportRepository } = buildService();
      const updatedReport = {
        id: 1,
        title: "Updated",
        location: JSON.stringify({ latitude: 45, longitude: 9 }),
        category: { id: 1, name: "Test", description: "Test" },
        citizen: { id: 123, firstName: "Test", lastName: "Test" },
        status: ReportStatus.PENDING_APPROVAL,
        explanation: undefined,
        assignedTo: undefined,
        createdAt: new Date(),
        photo1: undefined,
        photo2: undefined,
        photo3: undefined,
      };
      reportRepository.findById.mockResolvedValue(updatedReport);
      reportRepository.updateStatus.mockResolvedValue(updatedReport);

      const result = await service.updateReport(1, { 
        status: ReportStatus.REJECTED,
        explanation: "Not valid"
      });
      
      expect(reportRepository.updateStatus).toHaveBeenCalledWith(
        1,
        ReportStatus.REJECTED,
        "Not valid",
        undefined
      );
      expect(result.status).toBe(ReportStatus.REJECTED);
    });

    it("should throw when report does not exist", async () => {
      const { service, reportRepository } = buildService();
      reportRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateReport(999, {
          status: ReportStatus.REJECTED,
          explanation: ""
        })
      ).rejects.toThrow("Report not found");
    });

    it("should throw when PR officer tries to update non-pending report", async () => {
      const { service, reportRepository } = buildService();
      const assignedReport = {
        ...baseReport,
        status: ReportStatus.ASSIGNED,
      };
      reportRepository.findById.mockResolvedValue(assignedReport);

      await expect(
        service.updateReport(
          1,
          {
            status: ReportStatus.IN_PROGRESS,
            explanation: ""
          },
          "Public Relations Officer"
        )
      ).rejects.toThrow('PR officers can only update reports with status "Pending Approval"');
    });

    it("should allow PR officer to update pending report", async () => {
      const { service, reportRepository } = buildService();
      const pendingReport = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
      };
      reportRepository.findById.mockResolvedValue(pendingReport);
      reportRepository.updateStatus.mockResolvedValue({
        ...pendingReport,
        status: ReportStatus.REJECTED,
      });

      const result = await service.updateReport(
        1,
        { status: ReportStatus.REJECTED, explanation: "Invalid" },
        "Public Relations Officer"
      );

      expect(result.status).toBe(ReportStatus.REJECTED);
    });

    it("should update category when categoryId is provided", async () => {
      const { service, reportRepository, categoryRepository } = buildService();
      const newCategory = { id: 2, name: "Water", description: "Water issues" };
      reportRepository.findById.mockResolvedValue(baseReport);
      categoryRepository.findById.mockResolvedValue(newCategory);
      reportRepository.updateStatus.mockResolvedValue({
        ...baseReport,
        category: newCategory,
      });

      await service.updateReport(1, {
        status: ReportStatus.REJECTED,
        categoryId: 2,
        explanation: ""
      });

      expect(categoryRepository.findById).toHaveBeenCalledWith(2);
      expect(reportRepository.updateStatus).toHaveBeenCalled();
    });

    it("should throw when categoryId is invalid", async () => {
      const { service, reportRepository, categoryRepository } = buildService();
      reportRepository.findById.mockResolvedValue(baseReport);
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateReport(1, {
          status: ReportStatus.REJECTED,
          categoryId: 999,
          explanation: ""
        })
      ).rejects.toThrow("Category not found with ID: 999");
    });

    it("should auto-assign officer when status changes to ASSIGNED", async () => {
      const { 
        service, 
        reportRepository, 
        categoryRepository,
        categoryRoleRepository,
        internalUserRepository 
      } = buildService();
      
      const role = { id: 5, name: "Road Officer" };
      const officer = { id: 100, activeTasks: 2, role };
      const categoryRoleMapping = { role };

      // Reset category mock to use "Road"
      const roadCategory = { id: 1, name: "Road", description: "Road issues" };
      categoryRepository.findById.mockResolvedValue(roadCategory);
      
      const reportWithRoadCategory = { ...baseReport, category: roadCategory };
      reportRepository.findById.mockResolvedValue(reportWithRoadCategory);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);
      internalUserRepository.findByRoleId.mockResolvedValue([officer]);
      reportRepository.updateStatus.mockResolvedValue({
        ...reportWithRoadCategory,
        status: ReportStatus.ASSIGNED,
        assignedTo: officer,
      });

      const result = await service.updateReport(1, {
        status: ReportStatus.ASSIGNED,
        explanation: ""
      });

      expect(categoryRoleRepository.findRoleByCategory).toHaveBeenCalledWith("Road");
      expect(internalUserRepository.findByRoleId).toHaveBeenCalledWith(5);
      expect(internalUserRepository.incrementActiveTasks).toHaveBeenCalledWith(100);
      expect(result.status).toBe(ReportStatus.ASSIGNED);
    });

    it("should throw when no officers available for assignment", async () => {
      const {
        service,
        reportRepository,
        categoryRepository,
        categoryRoleRepository,
        internalUserRepository,
      } = buildService();

      const role = { id: 5, name: "Road Officer" };
      const categoryRoleMapping = { role };

      // Reset category mock to use "Road"
      const roadCategory = { id: 1, name: "Road", description: "Road issues" };
      categoryRepository.findById.mockResolvedValue(roadCategory);
      
      const reportWithRoadCategory = { ...baseReport, category: roadCategory };
      reportRepository.findById.mockResolvedValue(reportWithRoadCategory);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);
      internalUserRepository.findByRoleId.mockResolvedValue([]);

      await expect(
        service.updateReport(1, { status: ReportStatus.ASSIGNED, explanation: "" })
      ).rejects.toThrow("No officers available for category: Road");
    });

    it("should throw when no role found for category during assignment", async () => {
      const {
        service,
        reportRepository,
        categoryRepository,
        categoryRoleRepository,
      } = buildService();

      // Reset category mock to use "Road"
      const roadCategory = { id: 1, name: "Road", description: "Road issues" };
      categoryRepository.findById.mockResolvedValue(roadCategory);
      
      const reportWithRoadCategory = { ...baseReport, category: roadCategory };
      reportRepository.findById.mockResolvedValue(reportWithRoadCategory);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(null);

      await expect(
        service.updateReport(1, { status: ReportStatus.ASSIGNED, explanation: "" })
      ).rejects.toThrow("No role found for category: Road");
    });

    it("should select officer with least active tasks", async () => {
      const {
        service,
        reportRepository,
        categoryRoleRepository,
        internalUserRepository,
      } = buildService();

      const role = { id: 5, name: "Road Officer" };
      const officers = [
        { id: 101, activeTasks: 5, role },
        { id: 102, activeTasks: 2, role },
        { id: 103, activeTasks: 3, role },
      ];
      const categoryRoleMapping = { role };

      reportRepository.findById.mockResolvedValue(baseReport);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);
      internalUserRepository.findByRoleId.mockResolvedValue(officers);
      reportRepository.updateStatus.mockResolvedValue({
        ...baseReport,
        status: ReportStatus.ASSIGNED,
        assignedTo: officers[1],
      });

      await service.updateReport(1, { status: ReportStatus.ASSIGNED, explanation: "" });

      expect(internalUserRepository.incrementActiveTasks).toHaveBeenCalledWith(102);
    });
  });

  describe("getReportsByUser", () => {
    it("should return reports for the specified user", async () => {
      const { service, reportRepository } = buildService();
      const reportsDAO = [
        {
          id: 1,
          title: "Test",
          location: JSON.stringify({ latitude: 45, longitude: 9 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: "PENDING",
          explanation: undefined,
          assignedTo: undefined,
          createdAt: new Date(),
          photo1: undefined,
          photo2: undefined,
          photo3: undefined,
        },
      ];
      reportRepository.findByUser.mockResolvedValue(reportsDAO);

      const result = await service.getReportsByUser(123);
      
      expect(reportRepository.findByUser).toHaveBeenCalledWith(123);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe("Test");
      expect(result[0].citizenId).toBe(123);
    });
  });

  describe("getReportsForStaff", () => {
    it("should return reports assigned to the specified staff", async () => {
      const { service, reportRepository } = buildService();
      const reportsDAO = [
        {
          id: 1,
          title: "Test",
          location: JSON.stringify({ latitude: 45, longitude: 9 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: "PENDING",
          explanation: undefined,
          assignedTo: {
            id: 456,
            firstName: "Staff",
            lastName: "Member",
            email: "staff@example.com",
          },
          createdAt: new Date(),
          photo1: undefined,
          photo2: undefined,
          photo3: undefined,
        },
      ];
      reportRepository.findByAssignedStaff.mockResolvedValue(reportsDAO);

      const result = await service.getReportsForStaff(456);
      
      expect(reportRepository.findByAssignedStaff).toHaveBeenCalledWith(456);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe("Test");
      expect(result[0].assignedTo).toEqual({
        id: 456,
        firstName: "Staff",
        lastName: "Member",
        email: "staff@example.com",
      });
    });
  });

  describe("getReportsByOffice", () => {
    it("should return reports for the specified office", async () => {
      const {
        service,
        internalUserRepository,
        categoryRoleRepository,
        reportRepository,
      } = buildService();
      const staff = { id: 789, role: { office: { id: 1 } } };
      const categories = [{ id: 2 }];
      const reportsDAO = [
        {
          id: 1,
          title: "Test",
          location: JSON.stringify({ latitude: 45, longitude: 9 }),
          category: { id: 2, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: "PENDING",
          explanation: undefined,
          assignedTo: undefined,
          createdAt: new Date(),
          photo1: undefined,
          photo2: undefined,
          photo3: undefined,
        },
      ];

      internalUserRepository.findByIdWithRoleAndOffice.mockResolvedValue(staff);
      categoryRoleRepository.findCategoriesByOffice.mockResolvedValue(categories);
      reportRepository.findByCategoryIds.mockResolvedValue(reportsDAO);

      const result = await service.getReportsByOffice(789);
      
      expect(internalUserRepository.findByIdWithRoleAndOffice).toHaveBeenCalledWith(789);
      expect(categoryRoleRepository.findCategoriesByOffice).toHaveBeenCalledWith(1);
      expect(reportRepository.findByCategoryIds).toHaveBeenCalledWith([2]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe("Test");
    });

    it("should throw when internal user not found", async () => {
      const { service, internalUserRepository } = buildService();
      internalUserRepository.findByIdWithRoleAndOffice.mockResolvedValue(null);

      await expect(service.getReportsByOffice(999)).rejects.toThrow(
        "Internal user not found"
      );
    });

    it("should return empty array when office has no categories", async () => {
      const { service, internalUserRepository, categoryRoleRepository } = buildService();
      const staff = { id: 789, role: { office: { id: 1 } } };

      internalUserRepository.findByIdWithRoleAndOffice.mockResolvedValue(staff);
      categoryRoleRepository.findCategoriesByOffice.mockResolvedValue([]);

      const result = await service.getReportsByOffice(789);
      expect(result).toEqual([]);
    });

    it("should return empty array when staff has no office", async () => {
      const { service, internalUserRepository } = buildService();
      const staff = { id: 789, role: { office: null } };

      internalUserRepository.findByIdWithRoleAndOffice.mockResolvedValue(staff);

      const result = await service.getReportsByOffice(789);
      expect(result).toEqual([]);
    });
  });
});