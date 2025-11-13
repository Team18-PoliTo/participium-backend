import { RoleRepository } from "../../../src/repositories/RoleRepository";
import RoleDAO from "../../../src/models/dao/RoleDAO";
import { Repository } from "typeorm";

describe("RoleRepository", () => {
  let roleRepo: RoleRepository;
  let typeOrmMock: jest.Mocked<Repository<RoleDAO>>;

  beforeEach(() => {
    typeOrmMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
    } as any;

    roleRepo = new RoleRepository(typeOrmMock);
  });

  describe("create", () => {
    it("should create and save a new role", async () => {
      const role = { id: 1, role: "admin" } as RoleDAO;
      typeOrmMock.create.mockReturnValue(role);
      typeOrmMock.save.mockResolvedValue({ ...role, id: 1 });

      const result = await roleRepo.create(role);
      expect(typeOrmMock.create).toHaveBeenCalledWith(role);
      expect(typeOrmMock.save).toHaveBeenCalledWith(role);
      expect(result.id).toBe(1);
    });

    it("should return error if role already exists", async () => {
      const role = { id: 1, role: "admin" } as RoleDAO;
      typeOrmMock.create.mockReturnValue(role);
      typeOrmMock.save.mockRejectedValue({ code: "23505" }); // Simulate unique constraint violation
      await expect(roleRepo.create(role)).rejects.toEqual({ code: "23505" });
    });
  });

  describe("findById", () => {
    it("should return a role if it exists", async () => {
      const role = { id: 1, role: "admin" } as RoleDAO;
      typeOrmMock.findOneBy.mockResolvedValue(role);

      const result = await roleRepo.findById(1);
      expect(typeOrmMock.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(role);
    });

    it("should return null if role does not exist", async () => {
      typeOrmMock.findOneBy.mockResolvedValue(null);

      const result = await roleRepo.findById(99);
      expect(typeOrmMock.findOneBy).toHaveBeenCalledWith({ id: 99 });
      expect(result).toBeNull();
    });
  });
});
