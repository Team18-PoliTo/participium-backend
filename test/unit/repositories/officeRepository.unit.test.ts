// test/unit/repositories/officeRepository.unit.test.ts
import { Repository } from "typeorm";
import OfficeDAO from "../../../src/models/dao/OfficeDAO";
import { OfficeRepository } from "../../../src/repositories/implementation/OfficeRepository";

describe("OfficeRepository", () => {
  let mockRepo: jest.Mocked<Repository<OfficeDAO>>;
  let repository: OfficeRepository;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<OfficeDAO>>;

    repository = new OfficeRepository(mockRepo);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("findAll should call repo.find with roles relation", async () => {
    const offices = [{ id: 1 } as OfficeDAO, { id: 2 } as OfficeDAO];
    mockRepo.find.mockResolvedValue(offices);

    const result = await repository.findAll();

    expect(mockRepo.find).toHaveBeenCalledWith({ relations: ["roles"] });
    expect(result).toBe(offices);
  });

  it("findById should call repo.findOne with where id and roles", async () => {
    const office = { id: 5 } as OfficeDAO;
    mockRepo.findOne.mockResolvedValue(office);

    const result = await repository.findById(5);

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 5 },
      relations: ["roles"],
    });
    expect(result).toBe(office);
  });

  it("findByName should call repo.findOne with where name and roles", async () => {
    const office = { id: 3, name: "Technical Office" } as OfficeDAO;
    mockRepo.findOne.mockResolvedValue(office);

    const result = await repository.findByName("Technical Office");

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { name: "Technical Office" },
      relations: ["roles"],
    });
    expect(result).toBe(office);
  });

  it("create should call repo.create and repo.save", async () => {
    const payload: Partial<OfficeDAO> = { name: "New Office" };
    const created = { id: 10, name: "New Office" } as OfficeDAO;

    mockRepo.create.mockReturnValue(created);
    mockRepo.save.mockResolvedValue(created);

    const result = await repository.create(payload);

    expect(mockRepo.create).toHaveBeenCalledWith(payload);
    expect(mockRepo.save).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });
});
