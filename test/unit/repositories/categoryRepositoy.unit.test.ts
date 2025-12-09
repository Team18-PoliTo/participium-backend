// test/unit/repositories/categoryRepository.test.ts
import { Repository } from "typeorm";
import { AppDataSource } from "../../../src/config/database";
import CategoryDAO from "../../../src/models/dao/CategoryDAO";
import CategoryRepository from "../../../src/repositories/implementation/CategoryRepository";

// Helper type for a mocked TypeORM repository
type MockRepository = jest.Mocked<Repository<CategoryDAO>>;

describe("CategoryRepository", () => {
  let categoryRepository: CategoryRepository;
  let mockRepo: MockRepository;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as MockRepository;

    (AppDataSource as any).getRepository = jest.fn().mockReturnValue(mockRepo);

    categoryRepository = new CategoryRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return all categories with simple fields (findAllSimple)", async () => {
    const categories = [
      { id: 1, name: "Potholes", description: "Road surface problems" },
      { id: 2, name: "Garbage", description: "Waste issues" },
    ] as CategoryDAO[];

    mockRepo.find.mockResolvedValue(categories);

    const result = await categoryRepository.findAllSimple();
    expect(mockRepo.find).toHaveBeenCalledWith({
      select: ["id", "name", "description"],
      order: { id: "ASC" },
    });
    expect(result).toEqual(categories);
  });

  it("should return all categories with relations (findAll)", async () => {
    const categories = [
      { id: 1, name: "Potholes" },
      { id: 2, name: "Garbage" },
    ] as CategoryDAO[];

    mockRepo.find.mockResolvedValue(categories);

    const result = await categoryRepository.findAll();

    expect(mockRepo.find).toHaveBeenCalledWith({
      relations: ["categoryRoles", "categoryRoles.role"],
      order: { id: "ASC" },
    });
    expect(result).toEqual(categories);
  });

  it("should find category by id (findById)", async () => {
    const category = {
      id: 1,
      name: "Potholes",
    } as CategoryDAO;

    mockRepo.findOne.mockResolvedValue(category);

    const result = await categoryRepository.findById(1);

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ["categoryRoles", "categoryRoles.role"],
    });
    expect(result).toEqual(category);
  });

  it("should find category by name (findByName)", async () => {
    const category = {
      id: 2,
      name: "Garbage",
    } as CategoryDAO;

    mockRepo.findOne.mockResolvedValue(category);

    const result = await categoryRepository.findByName("Garbage");

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { name: "Garbage" },
      relations: ["categoryRoles", "categoryRoles.role"],
    });
    expect(result).toEqual(category);
  });

  it("should create a new category (create)", async () => {
    const input: Partial<CategoryDAO> = {
      name: "Lighting",
      description: "Street lights issues",
    };

    const created = {
      id: 3,
      name: "Lighting",
      description: "Street lights issues",
    } as CategoryDAO;

    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(created);

    const result = await categoryRepository.create(input);

    expect(mockRepo.create).toHaveBeenCalledWith(input);
    expect(mockRepo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });
});
