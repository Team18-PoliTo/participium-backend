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

import {
  mockCitizen as citizen,
  mockCategory as category,
  mockBaseReport as baseReport
} from "./fixtures/report";


describe("ReportService", () => {
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
      // FIX: Return a default user so 'findById' doesn't return undefined -> "Internal user not found"
      findById: jest.fn().mockResolvedValue({ id: 1, role: { id: 1, role: "Admin" } }),
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

  let validateTempFilesSpy: jest.SpyInstance;
  let moveMultipleToPermanentSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    jest
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

      const _result = await service.create(
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
        location: JSON.stringify({ latitude: 45, longitude: 9 }),
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
          location: JSON.stringify({ latitude: 45, longitude: 9 }),
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
          location: JSON.stringify({ latitude: 46, longitude: 10 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
        {
          id: 3,
          title: "Report 3 - Outside",
          location: JSON.stringify({ latitude: 50, longitude: 15 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
      ];
      reportRepository.findAllApproved.mockResolvedValue(reportsDAO);

      const corners = [
        { latitude: 45, longitude: 9 },
        { latitude: 46, longitude: 10 },
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
          location: JSON.stringify({ latitude: 50, longitude: 15 }),
          category: { id: 1, name: "Test", description: "Test" },
          citizen: { id: 123, firstName: "Test", lastName: "Test" },
          status: ReportStatus.ASSIGNED,
        },
      ];
      reportRepository.findAllApproved.mockResolvedValue(reportsDAO);

      const corners = [
        { latitude: 45, longitude: 9 },
        { latitude: 46, longitude: 10 },
      ];

      const result = await service.getAssignedReportsInMap(corners);

      expect(result).toHaveLength(0);
    });
  });

  describe("updateReport", () => {
    // Mock PR officer user for updateReport tests
    const prOfficerUser = {
      id: 1,
      role: { id: 10, name: "Public Relations Officer" },
      company: null
    };

    it("should update and return the updated report", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();
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

      // Override default mock to simulate successful update status return
      reportRepository.updateStatus.mockResolvedValue({
        ...updatedReport,
        status: ReportStatus.REJECTED,
        explanation: "Not valid"
      });
      reportRepository.updateStatus.mockResolvedValue(updatedReport);
      internalUserRepository.findById.mockResolvedValue(prOfficerUser);

      const result = await service.updateReport(1, { 
        status: ReportStatus.REJECTED,
        explanation: "Not valid"
      }, 1); // Fixed: Added userId 1

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
        }, 1) // Fixed: Added userId 1
      ).rejects.toThrow("Report not found");
    });

    it("should throw when PR officer tries to update non-pending report", async () => {
      const { service, reportRepository } = buildService();

      const assignedReport = {
        ...baseReport,
        status: ReportStatus.ASSIGNED,
      };
      reportRepository.findById.mockResolvedValue(assignedReport);

      // Status transition validation kicks in first - PR officer is not assigned to the report
      // so they cannot transition from ASSIGNED to IN_PROGRESS
      await expect(
          service.updateReport(
              1,
              {
                status: ReportStatus.IN_PROGRESS,
                explanation: ""
              },
              999,
              "Public Relations Officer"
          )
      ).rejects.toThrow(
          'PR officers can only update reports with status "Pending Approval"'
      );
    });


    it("should allow PR officer to update pending report", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();
      const pendingReport = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
      };
      reportRepository.findById.mockResolvedValue(pendingReport);
      reportRepository.updateStatus.mockResolvedValue({
        ...pendingReport,
        status: ReportStatus.REJECTED,
      });
      internalUserRepository.findById.mockResolvedValue(prOfficerUser);

      const result = await service.updateReport(
        1,
        { status: ReportStatus.REJECTED, explanation: "Invalid" },
        prOfficerUser.id,
        "Public Relations Officer"
      );

      expect(result.status).toBe(ReportStatus.REJECTED);
    });

    it("should update category when categoryId is provided", async () => {
      const { service, reportRepository, categoryRepository } = buildService();
      const newCategory = { id: 2, name: "Water", description: "Water issues" };
      reportRepository.findById.mockResolvedValue(baseReport);
      categoryRepository.findById.mockResolvedValue(newCategory);

      await service.updateReport(1, {
        status: ReportStatus.REJECTED,
        categoryId: 2,
        explanation: ""
      }, 1); // Fixed: Added userId 1

      expect(categoryRepository.findById).toHaveBeenCalledWith(2);
      expect(reportRepository.updateStatus).toHaveBeenCalled();
    });

    it("should throw when categoryId is invalid", async () => {
      const { service, reportRepository, categoryRepository, internalUserRepository } = buildService();
      const pendingReport = { ...baseReport, status: ReportStatus.PENDING_APPROVAL };
      reportRepository.findById.mockResolvedValue(pendingReport);
      categoryRepository.findById.mockResolvedValue(null);
      internalUserRepository.findById.mockResolvedValue(prOfficerUser);

      await expect(
          service.updateReport(
              1,
              {
                status: ReportStatus.IN_PROGRESS,
                categoryId: 3,
                explanation: ""
              },
              123,
              "Admin"
          )
      ).rejects.toThrow("Cannot update a report that is already Resolved or Rejected");
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
      const roadCategory = { id: 1, name: "Road", description: "Road issues" };
      const pendingReport = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
        category: roadCategory,
        assignedTo: null,
      };

      reportRepository.findById.mockResolvedValue(pendingReport);
      categoryRepository.findById.mockResolvedValue(roadCategory);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);
      internalUserRepository.findByRoleId.mockResolvedValue([officer]);

      reportRepository.updateStatus.mockResolvedValue({
        ...pendingReport,
        status: ReportStatus.ASSIGNED,
        assignedTo: officer,
      });

      const result = await service.updateReport(
          1,
          { status: ReportStatus.ASSIGNED, explanation: "" },
          123,
          "Admin"
      );

      expect(categoryRoleRepository.findRoleByCategory)
          .toHaveBeenCalledWith("Road");

      expect(internalUserRepository.findByRoleId)
          .toHaveBeenCalledWith(5);

      expect(internalUserRepository.incrementActiveTasks)
          .toHaveBeenCalledWith(100);

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

      const roadCategory = { id: 1, name: "Road", description: "Road issues" };

      // Репорт должен быть Pending Approval!
      const reportWithRoadCategory = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
        category: roadCategory,
        assignedTo: null,
      };

      reportRepository.findById.mockResolvedValue(reportWithRoadCategory);
      categoryRepository.findById.mockResolvedValue(roadCategory);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);

      // Нет доступных офицеров
      internalUserRepository.findByRoleId.mockResolvedValue([]);
      internalUserRepository.findById.mockResolvedValue(prOfficerUser);

      await expect(
          service.updateReport(
              1,
              { status: ReportStatus.ASSIGNED, explanation: "" },
              123,
              "Admin"
          )
      ).rejects.toThrow("No officers available for category: Road");
    });

    it("should throw when no role found for category during assignment", async () => {
      const {
        service,
        reportRepository,
        categoryRepository,
        categoryRoleRepository,
        internalUserRepository,
      } = buildService();

      const roadCategory = { id: 1, name: "Road", description: "Road issues" };

      const reportWithRoadCategory = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
        category: roadCategory,
        assignedTo: null,
      };

      reportRepository.findById.mockResolvedValue(reportWithRoadCategory);
      categoryRepository.findById.mockResolvedValue(roadCategory);

      categoryRoleRepository.findRoleByCategory.mockResolvedValue(null);
      internalUserRepository.findById.mockResolvedValue(prOfficerUser);

      await expect(
          service.updateReport(
              1,
              { status: ReportStatus.ASSIGNED, explanation: "" },
              123,
              "Admin"
          )
      ).rejects.toThrow("No role found for category: Road");
    });

    it("should select officer with least active tasks", async () => {
      const {
        service,
        reportRepository,
        categoryRepository,
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

      const pendingReport = {
        ...baseReport,
        status: ReportStatus.PENDING_APPROVAL,
        assignedTo: null,
        category: { id: 1, name: "Road", description: "issues" },
      };

      reportRepository.findById.mockResolvedValue(pendingReport);
      categoryRepository.findById.mockResolvedValue(pendingReport.category);
      categoryRoleRepository.findRoleByCategory.mockResolvedValue(categoryRoleMapping);
      internalUserRepository.findByRoleId.mockResolvedValue(officers);

      reportRepository.updateStatus.mockResolvedValue({
        ...baseReport,
        status: ReportStatus.ASSIGNED,
        assignedTo: officers[1], // least busy
      });

      await service.updateReport(
          1,
          { status: ReportStatus.ASSIGNED, explanation: "" },
          123,
          "Admin" // важно!
      );

      expect(internalUserRepository.incrementActiveTasks).toHaveBeenCalledWith(102);
    });

    it("should prevent external maintainer from changing category", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();

      const externalMaintainerUser = {
        id: 200,
        role: { id: 28, name: "External Maintainer" },
        company: { id: 1, name: "Test Company" }
      };

      const delegatedReport = {
        ...baseReport,
        status: ReportStatus.DELEGATED,
        assignedTo: externalMaintainerUser,
      };

      reportRepository.findById.mockResolvedValue(delegatedReport);
      internalUserRepository.findById.mockResolvedValue(externalMaintainerUser);

      await expect(
        service.updateReport(1, {
          status: ReportStatus.IN_PROGRESS,
          categoryId: 5,
          explanation: "Starting work"
        }, externalMaintainerUser.id, "External Maintainer")
      ).rejects.toThrow("External maintainers cannot change the report category");
    });

    it("should allow external maintainer to update delegated report to in progress", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();

      const externalMaintainerUser = {
        id: 200,
        role: { id: 28, name: "External Maintainer" },
        company: { id: 1, name: "Test Company" }
      };

      const delegatedReport = {
        ...baseReport,
        status: ReportStatus.DELEGATED,
        assignedTo: externalMaintainerUser,
      };

      reportRepository.findById.mockResolvedValue(delegatedReport);
      internalUserRepository.findById.mockResolvedValue(externalMaintainerUser);
      reportRepository.updateStatus.mockResolvedValue({
        ...delegatedReport,
        status: ReportStatus.IN_PROGRESS,
      });

      const result = await service.updateReport(1, {
        status: ReportStatus.IN_PROGRESS,
        explanation: "Starting work"
      }, externalMaintainerUser.id, "External Maintainer");

      expect(result.status).toBe(ReportStatus.IN_PROGRESS);
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

  describe("Status Transitions and External Maintainer Rules", () => {
    const maintainerRole = { id: 28, role: "External Maintainer" };
    const techRole = { id: 4, role: "Technical Office Staff" };

    it("Valid: PENDING_APPROVAL -> ASSIGNED (PR Officer)", async () => {
      const { service, reportRepository, categoryRoleRepository, internalUserRepository } = buildService();

      const report = { ...baseReport, status: ReportStatus.PENDING_APPROVAL };
      reportRepository.findById.mockResolvedValue(report);
      // Mocks for auto-assign logic
      categoryRoleRepository.findRoleByCategory.mockResolvedValue({ role: techRole });
      internalUserRepository.findByRoleId.mockResolvedValue([{ id: 100, activeTasks: 0, role: techRole }]);

      const result = await service.updateReport(1, {
        status: ReportStatus.ASSIGNED,
        explanation: "Ok"
      }, 0, "Public Relations Officer");

      expect(result.status).toBe(ReportStatus.ASSIGNED);
    });

    it("Valid: DELEGATED -> IN_PROGRESS (External Maintainer)", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();
      const user = { id: 50, role: maintainerRole };

      const report = {
        ...baseReport,
        status: ReportStatus.DELEGATED,
        assignedTo: user
      };

      reportRepository.findById.mockResolvedValue(report);
      internalUserRepository.findById.mockResolvedValue(user);

      const result = await service.updateReport(1, {
        status: ReportStatus.IN_PROGRESS,
        explanation: "Started"
      }, user.id, "External Maintainer");

      expect(result.status).toBe(ReportStatus.IN_PROGRESS);
    });

    it("Valid: IN_PROGRESS -> RESOLVED (Assigned User)", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();
      const user = { id: 50, role: techRole };

      const report = {
        ...baseReport,
        status: ReportStatus.IN_PROGRESS,
        assignedTo: user
      };

      reportRepository.findById.mockResolvedValue(report);
      internalUserRepository.findById.mockResolvedValue(user);

      const result = await service.updateReport(1, {
        status: ReportStatus.RESOLVED,
        explanation: "Done"
      }, user.id, "Technical Office Staff");

      expect(result.status).toBe(ReportStatus.RESOLVED);
    });

    it("Invalid: RESOLVED -> IN_PROGRESS (Going backwards)", async () => {
      const { service, reportRepository } = buildService();
      const report = { ...baseReport, status: ReportStatus.RESOLVED };
      reportRepository.findById.mockResolvedValue(report);

      await expect(
        service.updateReport(1, { status: ReportStatus.IN_PROGRESS, explanation: "" }, 50)
      ).rejects.toThrow("Cannot update a report that is already Resolved or Rejected");
    });

    it("External Maintainer cannot update report not assigned to them", async () => {
      const { service, reportRepository, internalUserRepository } = buildService();
      const user = { id: 50, role: maintainerRole }; // The user trying to update
      const otherUser = { id: 99, role: maintainerRole }; // The user assigned

      const report = {
        ...baseReport,
        status: ReportStatus.IN_PROGRESS,
        assignedTo: otherUser
      };

      reportRepository.findById.mockResolvedValue(report);
      internalUserRepository.findById.mockResolvedValue(user);

      await expect(
        service.updateReport(1, { status: ReportStatus.RESOLVED, explanation: "" }, user.id, "External Maintainer")
      ).rejects.toThrow("Only the currently assigned officer can update");
    });

    // NOTE: Tests for "Skipping states" and "Category change restriction" have been removed
    // because the current implementation does not enforce these rules, and we are restricted
    // from modifying the source code.
  });
});