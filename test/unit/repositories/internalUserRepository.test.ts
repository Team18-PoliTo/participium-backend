import InternalUserRepository from "../../../src/repositories/InternalUserRepository";
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";
import type { Repository, SelectQueryBuilder } from "typeorm";

describe("InternalUserRepository", () => {
  let repo: InternalUserRepository;
  let typeOrmMock: jest.Mocked<Repository<InternalUserDAO>>;
  let qb: jest.Mocked<SelectQueryBuilder<InternalUserDAO>>;

  beforeEach(() => {
    qb = {
      createQueryBuilder: jest.fn(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    } as any;

    typeOrmMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as any;

    repo = new InternalUserRepository(typeOrmMock as any);
  });

  afterEach(() => jest.clearAllMocks());

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
      (qb.getOne as jest.Mock).mockResolvedValue(user);

      const result = await repo.findByEmail("a@b.com");

      expect(typeOrmMock.createQueryBuilder).toHaveBeenCalledWith("internalUser");
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith("internalUser.role", "role");
      expect(qb.where).toHaveBeenCalledWith("LOWER(internalUser.email) = LOWER(:email)", { email: "a@b.com" });
      expect(result).toEqual(user);
    });

    it("should include password when requested", async () => {
      const user = { id: 2, email: "a@b.com", password: "hash" } as InternalUserDAO;
      (qb.getOne as jest.Mock).mockResolvedValue(user);

      const result = await repo.findByEmail("a@b.com", { withPassword: true });

      expect(qb.addSelect).toHaveBeenCalledWith("internalUser.password");
      expect(result).toEqual(user);
    });

    it("should return null if email does not exist", async () => {
      (qb.getOne as jest.Mock).mockResolvedValue(null);

      const result = await repo.findByEmail("nonexistent@b.com");
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return a user if id exists", async () => {
      const user = { id: 1, email: "a@b.com", role: {} } as InternalUserDAO;
      typeOrmMock.findOne.mockResolvedValue(user);
      const result = await repo.findById(1);
      expect(typeOrmMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["role"],
      });
      expect(result).toEqual(user);
    });

    it("should return null if id does not exist", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);
      const result = await repo.findById(99);
      expect(typeOrmMock.findOne).toHaveBeenCalledWith({
        where: { id: 99 },
        relations: ["role"],
      });
      expect(result).toBeNull();
    });
  });

  describe("fetchAll", () => {
    it("should include role relation when fetching all", async () => {
      typeOrmMock.find.mockResolvedValue([]);
      await repo.fetchAll();
      expect(typeOrmMock.find).toHaveBeenCalledWith({
        relations: ["role"],
      });
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
