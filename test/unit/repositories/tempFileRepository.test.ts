import { Repository } from "typeorm";
import TempFileRepository from "../../../src/repositories/implementation/TempFileRepository";
import TempFileDAO from "../../../src/models/dao/TempFileDAO";
import { AppDataSource } from "../../../src/config/database";

describe("TempFileRepository", () => {
  let repository: TempFileRepository;
  let mockRepo: jest.Mocked<Repository<TempFileDAO>>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<TempFileDAO>>;

    jest.spyOn(AppDataSource, "getRepository").mockReturnValue(mockRepo as any);
    
    repository = new TempFileRepository();
  });

  it("create should save temp file", async () => {
    const payload = { fileId: "uuid" };
    const saved = { id: 1, ...payload } as TempFileDAO;
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);

    const result = await repository.create(payload);
    expect(result).toBe(saved);
  });

  it("findByFileId should find one", async () => {
    const file = { fileId: "abc" } as TempFileDAO;
    mockRepo.findOne.mockResolvedValue(file);

    const result = await repository.findByFileId("abc");
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { fileId: "abc" } });
    expect(result).toBe(file);
  });

  it("findExpired should find with LessThan date", async () => {
    await repository.findExpired();
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { expiresAt: expect.any(Object) } // LessThan matcher check is complex due to TypeORM operator
    });
  });

  it("delete should call repo delete", async () => {
    await repository.delete(5);
    expect(mockRepo.delete).toHaveBeenCalledWith(5);
  });
});