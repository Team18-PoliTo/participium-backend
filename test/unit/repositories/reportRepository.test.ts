import { AppDataSource } from "../../../src/config/database";
import { ReportRepository } from "../../../src/repositories/implementation/ReportRepository";
import ReportDAO from "../../../src/models/dao/ReportDAO";
import { ReportStatus } from "../../../src/constants/ReportStatus";

describe("ReportRepository", () => {
  const save = jest.fn();
  const create = jest.fn();
  const findOne = jest.fn();
  const find = jest.fn();
  const update = jest.fn();
  let repoSpy: jest.SpyInstance;

  beforeEach(() => {
    repoSpy = jest.spyOn(AppDataSource, "getRepository").mockReturnValue({
      create,
      save,
      findOne,
      find,
      update,
    } as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    repoSpy.mockRestore();
  });

  describe("create", () => {
    it("create proxies to underlying repository", async () => {
      const repo = new ReportRepository();
      const dto = { title: "Report" } as ReportDAO;
      create.mockReturnValue(dto);
      save.mockResolvedValue({ ...dto, id: 1 });

      const result = await repo.create(dto);

      expect(create).toHaveBeenCalledWith(dto);
      expect(save).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ ...dto, id: 1 });
    });
  });

  describe("findById", () => {
    it("findById forwards relation lookup", async () => {
      const repo = new ReportRepository();
      findOne.mockResolvedValue({ id: 10 });

      const result = await repo.findById(10);

      expect(findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ["citizen", "category", "assignedTo"],
      });
      expect(result).toEqual({ id: 10 });
    });

    it("returns null when report not found", async () => {
      const repo = new ReportRepository();
      findOne.mockResolvedValue(null);

      const result = await repo.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("update uses save and returns updated entity", async () => {
      const repo = new ReportRepository();
      save.mockResolvedValue({ id: 2, title: "Updated" });

      const result = await repo.update({ id: 2, title: "Updated" });

      expect(save).toHaveBeenCalledWith({ id: 2, title: "Updated" });
      expect(result).toEqual({ id: 2, title: "Updated" });
    });
  });

  describe("findByStatus", () => {
    it("should find reports by status with correct relations and ordering", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, status: ReportStatus.PENDING_APPROVAL, title: "Report 1" },
        { id: 2, status: ReportStatus.PENDING_APPROVAL, title: "Report 2" },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findByStatus(ReportStatus.PENDING_APPROVAL);

      expect(find).toHaveBeenCalledWith({
        where: { status: ReportStatus.PENDING_APPROVAL },
        relations: ["citizen"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array when no reports found for status", async () => {
      const repo = new ReportRepository();
      find.mockResolvedValue([]);

      const result = await repo.findByStatus(ReportStatus.REJECTED);

      expect(result).toEqual([]);
    });
  });

  describe("findAll", () => {
    it("should find all reports with correct relations and ordering", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, title: "Report 1" },
        { id: 2, title: "Report 2" },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findAll();

      expect(find).toHaveBeenCalledWith({
        relations: ["citizen", "explanation"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });
  });

  describe("findAllApproved", () => {
    it("should find reports with ASSIGNED or IN_PROGRESS or DELEGATED status", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, status: ReportStatus.ASSIGNED, title: "Report 1" },
        { id: 2, status: ReportStatus.IN_PROGRESS, title: "Report 2" },
        { id: 3, status: ReportStatus.DELEGATED, title: "Report 3" },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findAllApproved();

      expect(find).toHaveBeenCalledWith({
        where: {
          status: expect.objectContaining({
            _type: "in",
            _value: [
              ReportStatus.ASSIGNED,
              ReportStatus.IN_PROGRESS,
              ReportStatus.DELEGATED,
            ],
          }),
        },
        relations: ["citizen"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array when no approved reports exist", async () => {
      const repo = new ReportRepository();
      find.mockResolvedValue([]);

      const result = await repo.findAllApproved();

      expect(result).toEqual([]);
    });
  });

  describe("updateStatus", () => {
    it("should update status and return updated report", async () => {
      const repo = new ReportRepository();
      const updatedReport = {
        id: 1,
        status: ReportStatus.ASSIGNED,
        explanation: "Approved",
      };
      update.mockResolvedValue(undefined);
      findOne.mockResolvedValue(updatedReport);

      const result = await repo.updateStatus(
        1,
        ReportStatus.ASSIGNED,
        "Approved"
      );

      expect(update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        explanation: "Approved",
        assignedTo: undefined,
      });
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["citizen", "category", "assignedTo"],
      });
      expect(result).toEqual(updatedReport);
    });

    it("should update status with assignedTo", async () => {
      const repo = new ReportRepository();
      const officer = { id: 10, firstName: "John" };
      const updatedReport = {
        id: 1,
        status: ReportStatus.ASSIGNED,
        assignedTo: officer,
      };
      update.mockResolvedValue(undefined);
      findOne.mockResolvedValue(updatedReport);

      const result = await repo.updateStatus(
        1,
        ReportStatus.ASSIGNED,
        undefined,
        officer
      );

      expect(update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        explanation: undefined,
        assignedTo: officer,
      });
      expect(result).toEqual(updatedReport);
    });

    it("should update status without explanation", async () => {
      const repo = new ReportRepository();
      const updatedReport = {
        id: 1,
        status: ReportStatus.IN_PROGRESS,
      };
      update.mockResolvedValue(undefined);
      findOne.mockResolvedValue(updatedReport);

      const result = await repo.updateStatus(1, ReportStatus.IN_PROGRESS);

      expect(update).toHaveBeenCalledWith(1, {
        status: ReportStatus.IN_PROGRESS,
        explanation: undefined,
        assignedTo: undefined,
      });
      expect(result).toEqual(updatedReport);
    });
  });

  describe("findByUser", () => {
    it("should find reports by citizen id", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, title: "Report 1", citizen: { id: 123 } },
        { id: 2, title: "Report 2", citizen: { id: 123 } },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findByUser(123);

      expect(find).toHaveBeenCalledWith({
        where: {
          citizen: { id: 123 },
        },
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array when user has no reports", async () => {
      const repo = new ReportRepository();
      find.mockResolvedValue([]);

      const result = await repo.findByUser(999);

      expect(result).toEqual([]);
    });
  });

  describe("findByAssignedStaff", () => {
    it("should find reports assigned to staff member", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        {
          id: 1,
          title: "Report 1",
          assignedTo: { id: 456, firstName: "Staff" },
        },
        {
          id: 2,
          title: "Report 2",
          assignedTo: { id: 456, firstName: "Staff" },
        },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findByAssignedStaff(456);

      expect(find).toHaveBeenCalledWith({
        where: {
          assignedTo: { id: 456 },
        },
        relations: ["assignedTo", "category"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array when staff has no assigned reports", async () => {
      const repo = new ReportRepository();
      find.mockResolvedValue([]);

      const result = await repo.findByAssignedStaff(999);

      expect(result).toEqual([]);
    });
  });

  describe("findByCategoryIds", () => {
    it("should find reports by category ids", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, title: "Report 1", category: { id: 1 } },
        { id: 2, title: "Report 2", category: { id: 2 } },
        { id: 3, title: "Report 3", category: { id: 1 } },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findByCategoryIds([1, 2]);

      expect(find).toHaveBeenCalledWith({
        where: {
          category: {
            id: expect.objectContaining({
              _type: "in",
              _value: [1, 2],
            }),
          },
        },
        relations: ["assignedTo", "category"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });

    it("should return empty array when no reports found for category ids", async () => {
      const repo = new ReportRepository();
      find.mockResolvedValue([]);

      const result = await repo.findByCategoryIds([999]);

      expect(result).toEqual([]);
    });

    it("should handle multiple category ids", async () => {
      const repo = new ReportRepository();
      const mockReports = [
        { id: 1, category: { id: 1 } },
        { id: 2, category: { id: 2 } },
        { id: 3, category: { id: 3 } },
      ];
      find.mockResolvedValue(mockReports);

      const result = await repo.findByCategoryIds([1, 2, 3]);

      expect(find).toHaveBeenCalledWith({
        where: {
          category: {
            id: expect.objectContaining({
              _type: "in",
              _value: [1, 2, 3],
            }),
          },
        },
        relations: ["assignedTo", "category"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockReports);
    });
  });
});
