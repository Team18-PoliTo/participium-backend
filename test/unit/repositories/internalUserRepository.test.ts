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
      getMany: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      clone: jest.fn(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    } as any;

    typeOrmMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    } as any;

    repo = new InternalUserRepository(typeOrmMock as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create and save a new user", async () => {
      const user = {
        email: "ab.com",
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
      const user = { id: 1, email: "ab.com" } as InternalUserDAO;
      qb.getOne.mockResolvedValue(user);

      const result = await repo.findByEmail("ab.com");
      expect(typeOrmMock.createQueryBuilder).toHaveBeenCalledWith(
        "internalUser"
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        "internalUser.role",
        "role"
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        "internalUser.company", 
        "company"
      );
      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(internalUser.email) = LOWER(:email)",
        { email: "ab.com" }
      );
      expect(result).toEqual(user);
    });

    it("should include password when requested", async () => {
      const user = {
        id: 2,
        email: "ab.com",
        password: "hash",
      } as InternalUserDAO;
      qb.getOne.mockResolvedValue(user);

      const result = await repo.findByEmail("ab.com", { withPassword: true });
      expect(qb.addSelect).toHaveBeenCalledWith("internalUser.password");
      expect(result).toEqual(user);
    });

    it("should return null if email does not exist", async () => {
      qb.getOne.mockResolvedValue(null);

      const result = await repo.findByEmail("nonexistent@b.com");
      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return a user if id exists", async () => {
      const user = { id: 1, email: "ab.com", role: {} } as InternalUserDAO;
      typeOrmMock.findOne.mockResolvedValue(user);

      const result = await repo.findById(1);
      expect(typeOrmMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["role", "company"],
      });
      expect(result).toEqual(user);
    });

    it("should return null if id does not exist", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);

      const result = await repo.findById(99);
      expect(result).toBeNull();
    });
  });

  describe("fetchAll", () => {
    it("should include role relation when fetching all", async () => {
      const users = [{ id: 1, role: {} }] as InternalUserDAO[];
      typeOrmMock.find.mockResolvedValue(users);

      const result = await repo.fetchAll();
      expect(typeOrmMock.find).toHaveBeenCalledWith({ relations: ["role", "company"] });
      expect(result).toEqual(users);
    });
  });

  describe("update", () => {
    it("should save and return the updated user", async () => {
      const user = { id: 1, email: "ab.com" } as InternalUserDAO;
      typeOrmMock.save.mockResolvedValue(user);

      const result = await repo.update(user);
      expect(typeOrmMock.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe("findByRoleId", () => {
    it("should return users with the specified role ID", async () => {
      const users = [
        { id: 1, email: "user1@city.com", role: { id: 1 } },
        { id: 2, email: "user2@city.com", role: { id: 1 } },
      ] as InternalUserDAO[];
      typeOrmMock.find.mockResolvedValue(users);

      const result = await repo.findByRoleId(1);
      expect(typeOrmMock.find).toHaveBeenCalledWith({
        where: { role: { id: 1 } },
        relations: ["role", "company"],
      });
      expect(result).toEqual(users);
    });

    it("should return empty array if no users found with the role ID", async () => {
      typeOrmMock.find.mockResolvedValue([]);

      const result = await repo.findByRoleId(99);
      expect(typeOrmMock.find).toHaveBeenCalledWith({
        where: { role: { id: 99 } },
        relations: ["role", "company"],
      });
      expect(result).toEqual([]);
    });
  });

  describe('incrementActiveTasks', () => {
    it('should increment activeTasks for the specified user ID', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      typeOrmMock.createQueryBuilder.mockReturnValue(qb as any);

      await repo.incrementActiveTasks(1);

      expect(typeOrmMock.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(InternalUserDAO);
      expect(qb.set).toHaveBeenCalledWith({ activeTasks: expect.any(Function) });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 1 });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe('decrementActiveTasks', () => {
    it('should decrement activeTasks for the specified user ID, ensuring it does not go below 0', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      typeOrmMock.createQueryBuilder.mockReturnValue(qb as any);

      await repo.decrementActiveTasks(1);

      expect(typeOrmMock.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(InternalUserDAO);
      expect(qb.set).toHaveBeenCalledWith({ activeTasks: expect.any(Function) });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 1 });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe("findByIdWithRoleAndOffice", () => {
    it("should return user with role and office populated if ID exists", async () => {
      const user = {
        id: 1,
        email: "user@city.com",
        role: { office: { id: 1 } },
      } as InternalUserDAO;
      typeOrmMock.findOne.mockResolvedValue(user);

      const result = await repo.findByIdWithRoleAndOffice(1);
      expect(typeOrmMock.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["role", "role.office", "company"],
      });
      expect(result).toEqual(user);
    });

    it("should return null if user with ID does not exist", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);

      const result = await repo.findByIdWithRoleAndOffice(99);
      expect(typeOrmMock.findOne).toHaveBeenCalledWith({
        where: { id: 99 },
        relations: ["role", "role.office", "company"],
      });
      expect(result).toBeNull();
    });
  });

  describe("findExternalMaintainersByCompany", () => {
    it("should return maintainers for a specific company ordered by active tasks", async () => {
      const companyId = 5;
      const maintainers = [
        { id: 1, activeTasks: 0, role: { id: 28 }, company: { id: 5 } },
        { id: 2, activeTasks: 2, role: { id: 28 }, company: { id: 5 } },
      ] as InternalUserDAO[];

      typeOrmMock.find.mockResolvedValue(maintainers);

      const result = await repo.findExternalMaintainersByCompany(companyId);

      expect(typeOrmMock.find).toHaveBeenCalledWith({
        where: {
          role: { id: 28 },
          company: { id: companyId },
        },
        relations: ["role", "company"],
        order: { activeTasks: "ASC" },
      });
      expect(result).toEqual(maintainers);
    });
  });
});