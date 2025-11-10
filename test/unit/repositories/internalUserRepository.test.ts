import  InternalUserRepository  from "../../../src/repositories/InternalUserRepository"
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";
import { Repository } from "typeorm";

describe("InternalUserRepository", () => {
  let repo: InternalUserRepository;
  let typeOrmMock: jest.Mocked<Repository<InternalUserDAO>>;

  beforeEach(() => {
    typeOrmMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;
    repo = new InternalUserRepository(typeOrmMock);
  });

  describe("create", () => {
    it("should create and save a new user", async () => {
      const user = {
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        password: "pw",
        role: {},
      } as InternalUserDAO;
      typeOrmMock.create.mockReturnValue(user);
      typeOrmMock.save.mockResolvedValue({ ...user, id: 1 });

      const result = await repo.create(user);
      expect(typeOrmMock.create).toHaveBeenCalledWith(user);
      expect(typeOrmMock.save).toHaveBeenCalledWith(user);
      expect(result.id).toBe(1);
    });
  });

  describe("findByEmail", () => {
    it("should return a user if email exists", async () => {
      const user = { id: 1, email: "a@b.com" } as InternalUserDAO;
      typeOrmMock.findOne.mockResolvedValue(user);
      const result = await repo.findByEmail("a@b.com");
      expect(result).toEqual(user);
    });

    it("should return null if email does not exist", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);
      const result = await repo.findByEmail("nonexistent@b.com");
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return a user if id exists", async () => {
      const user = { id: 1, email: "a@b.com", role: {} } as InternalUserDAO;
      typeOrmMock.findOne.mockResolvedValue(user);
      const result = await repo.findById(1);
      expect(result).toEqual(user);
    });

    it("should return null if id does not exist", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);
      const result = await repo.findById(99);
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should save and return the updated user", async () => {
      const user = { id: 1, email: "a@b.com" } as InternalUserDAO;
      typeOrmMock.save.mockResolvedValue(user);
      const result = await repo.update(user);
      expect(typeOrmMock.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });
});
