import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("ReportRepository", () => {
  let repository: any;
  let mockRepo: any;
  let mockCommentRepo: any;

  beforeEach(() => {
    // 1. Clear module cache to allow fresh mock of AppDataSource
    jest.resetModules();
    jest.clearAllMocks();

    // 2. Define mocks
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    mockCommentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    // 3. Mock AppDataSource to return specific repos based on entity name
    jest.doMock("../../../src/config/database", () => ({
      AppDataSource: {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === "ReportDAO") return mockRepo;
          if (entity.name === "CommentDAO") return mockCommentRepo;
          return mockRepo;
        }),
      },
    }));

    // 4. Dynamically import class under test
    const { ReportRepository } = require("../../../src/repositories/implementation/ReportRepository");
    repository = new ReportRepository();
  });

  describe("create", () => {
    it("should create and save a report", async () => {
      const reportData = { title: "Test" };
      mockRepo.create.mockReturnValue(reportData);
      mockRepo.save.mockResolvedValue(reportData);

      const result = await repository.create(reportData);

      expect(mockRepo.create).toHaveBeenCalledWith(reportData);
      expect(mockRepo.save).toHaveBeenCalledWith(reportData);
      expect(result).toEqual(reportData);
    });
  });

  describe("findById", () => {
    it("should find report by id", async () => {
      const report = { id: 1 };
      mockRepo.findOne.mockResolvedValue(report);

      const result = await repository.findById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["citizen", "category", "assignedTo"],
      });
      expect(result).toEqual(report);
    });
  });

  describe("update", () => {
    it("should save partial report update", async () => {
      const updateData = { id: 1, title: "Updated" };
      mockRepo.save.mockResolvedValue(updateData);

      const result = await repository.update(updateData);

      expect(mockRepo.save).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updateData);
    });
  });

  describe("findByStatus", () => {
    it("should find reports by status", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      const result = await repository.findByStatus("PENDING");

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { status: "PENDING" },
        relations: ["citizen"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(reports);
    });
  });

  describe("findAll", () => {
    it("should find all reports", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      const result = await repository.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ["citizen", "explanation"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(reports);
    });
  });

  describe("findAllApproved", () => {
    it("should find all approved reports", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      await repository.findAllApproved();

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: expect.anything(), // TypeORM In(...) object
          },
          relations: ["citizen"],
          order: { createdAt: "DESC" },
        })
      );
    });
  });

  describe("updateStatus", () => {
    it("should update status and return updated report", async () => {
      const report = { id: 1, status: "RESOLVED" };
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(report);

      const result = await repository.updateStatus(1, "RESOLVED", "Done", { id: 2 });

      expect(mockRepo.update).toHaveBeenCalledWith(1, { 
        status: "RESOLVED", 
        explanation: "Done", 
        assignedTo: { id: 2 } 
      });
      expect(result).toEqual(report);
    });
  });

  describe("findByUser", () => {
    it("should find reports by citizen id", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      const result = await repository.findByUser(123);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { citizen: { id: 123 } },
      });
      expect(result).toEqual(reports);
    });
  });

  describe("updateReport", () => {
    it("should update report fields and return updated report", async () => {
      const updates = { status: "TEST", explanation: "exp", assignedTo: { id: 1 }, categoryId: 5 };
      const updatedReport = { id: 1, ...updates };
      
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updatedReport);

      const result = await repository.updateReport(1, updates);

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        status: updates.status,
        explanation: updates.explanation,
        assignedTo: updates.assignedTo,
        category: { id: 5 },
      });
      expect(result).toEqual(updatedReport);
    });

    it("should handle update without categoryId", async () => {
        const updates = { status: "TEST" };
        mockRepo.update.mockResolvedValue({ affected: 1 });
        mockRepo.findOne.mockResolvedValue({ id: 1 });
  
        await repository.updateReport(1, updates);
  
        expect(mockRepo.update).toHaveBeenCalledWith(1, {
          status: updates.status,
          explanation: undefined,
          assignedTo: undefined,
          category: undefined,
        });
      });
  });

  describe("findByAssignedStaff", () => {
    it("should find reports by staff id", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      const result = await repository.findByAssignedStaff(456);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { assignedTo: { id: 456 } },
        relations: ["assignedTo", "category"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(reports);
    });
  });

  describe("findByCategoryIds", () => {
    it("should find reports by category ids", async () => {
      const reports = [{ id: 1 }];
      mockRepo.find.mockResolvedValue(reports);

      await repository.findByCategoryIds([1, 2]);

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
            where: { category: { id: expect.anything() } },
            relations: ["assignedTo", "category"],
            order: { createdAt: "DESC" },
        })
      );
    });
  });

  // --- NEW TESTS FOR COMMENT METHODS ---
  
  describe("findCommentsByReportId", () => {
    it("should return comments for a report", async () => {
      const comments = [{ id: 1, text: "comment" }];
      mockCommentRepo.find.mockResolvedValue(comments);

      const result = await repository.findCommentsByReportId(1);

      expect(mockCommentRepo.find).toHaveBeenCalledWith({
        where: { report: { id: 1 } },
        relations: ["comment_owner"],
        order: { creation_date: "ASC" },
      });
      expect(result).toEqual(comments);
    });
  });

  describe("createComment", () => {
    it("should create and save a comment", async () => {
      const commentData = { comment: "text", comment_owner: { id: 2 }, report: { id: 1 } };
      const savedComment = { id: 1, ...commentData };
      
      mockCommentRepo.create.mockReturnValue(commentData);
      mockCommentRepo.save.mockResolvedValue(savedComment);

      const result = await repository.createComment(1, 2, "text");

      expect(mockCommentRepo.create).toHaveBeenCalledWith(commentData);
      expect(mockCommentRepo.save).toHaveBeenCalledWith(commentData);
      expect(result).toEqual(savedComment);
    });
  });
});