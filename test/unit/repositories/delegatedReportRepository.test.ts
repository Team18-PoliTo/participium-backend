import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("DelegatedReportRepository", () => {
  let repository: any;
  let mockRepo: any;
  let mockReportRepo: any;
  let mockInternalUserRepo: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), //ignore 
      })),
    };

    mockReportRepo = {
      findOne: jest.fn(),
    };

    mockInternalUserRepo = {
      findOne: jest.fn(),
    };

    jest.doMock("../../../src/config/database", () => ({
      AppDataSource: {
        getRepository: jest.fn((entity: any) => {
          if (entity.name === "DelegatedReportDAO") return mockRepo;
          if (entity.name === "ReportDAO") return mockReportRepo;
          if (entity.name === "InternalUserDAO") return mockInternalUserRepo;
          return mockRepo;
        }),
      },
    }));

    const { DelegatedReportRepository } = require("../../../src/repositories/implementation/DelegatedReportRepository");
    repository = new DelegatedReportRepository();
  });

  describe("create", () => {
    it("should create and save a delegated report if both report and user exist", async () => {
      const report = { id: 1 };
      const user = { id: 2 };
      const delegatedReport = { report, delegatedBy: user };

      mockReportRepo.findOne.mockResolvedValue(report);
      mockInternalUserRepo.findOne.mockResolvedValue(user);
      mockRepo.create.mockReturnValue(delegatedReport);
      mockRepo.save.mockResolvedValue(delegatedReport);

      const result = await repository.create(1, 2);

      expect(mockReportRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockInternalUserRepo.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(mockRepo.create).toHaveBeenCalledWith({ report, delegatedBy: user });
      expect(mockRepo.save).toHaveBeenCalledWith(delegatedReport);
      expect(result).toEqual(delegatedReport);
    });

    it("should throw error if report not found", async () => {
      mockReportRepo.findOne.mockResolvedValue(null);

      await expect(repository.create(1, 2)).rejects.toThrow(
        "Report with id 1 not found"
      );
    });

    it("should throw error if internal user not found", async () => {
      mockReportRepo.findOne.mockResolvedValue({ id: 1 });
      mockInternalUserRepo.findOne.mockResolvedValue(null);

      await expect(repository.create(1, 2)).rejects.toThrow(
        "Internal user with id 2 not found"
      );
    });
  });

  describe("deleteByReportId", () => {
    it("should delete delegation by report id", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });
      
      await repository.deleteByReportId(10);
      
      expect(mockRepo.delete).toHaveBeenCalledWith({ report: { id: 10 } });
    });
  });

  describe("findByReportId", () => {
    it("should find delegation by report id", async () => {
      const delegation = { id: 5, report: { id: 1 } };
      mockRepo.findOne.mockResolvedValue(delegation);

      const result = await repository.findByReportId(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { report: { id: 1 } },
      });
      expect(result).toEqual(delegation);
    });

    it("should return null if not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByReportId(1);
      expect(result).toBeNull();
    });
  });

  describe("findReportsByDelegatedBy", () => {
    it("should use query builder to find reports delegated by a specific user", async () => {
      const delegations = [{ id: 1 }, { id: 2 }];
      const qbMock = mockRepo.createQueryBuilder(); 
      qbMock.getMany.mockResolvedValue(delegations);

      const result = await repository.findReportsByDelegatedBy(5);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith("delegated");
    });
  });
});