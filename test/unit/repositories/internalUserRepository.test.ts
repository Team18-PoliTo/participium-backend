import InternalUserRepository from "../../../src/repositories/InternalUserRepository";
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../../src/models/dao/RoleDAO";
import CompanyDAO from "../../../src/models/dao/CompanyDAO";
import type { Repository, SelectQueryBuilder } from "typeorm";

function mockRole(overrides: Partial<RoleDAO> = {}): RoleDAO {
  return {
    id: 1,
    role: "Test Role",
    office: undefined,
    users: [],
    categories: [],
    ...overrides,
  } as RoleDAO;
}

function mockCompany(overrides: Partial<CompanyDAO> = {}): CompanyDAO {
  return {
    id: 1,
    name: "Test Company",
    address: "",
    users: [],
    ...overrides,
  } as CompanyDAO;
}

function mockUser(overrides: Partial<InternalUserDAO> = {}): InternalUserDAO {
  return {
    id: 1,
    email: "user@city.com",
    firstName: "A",
    lastName: "B",
    password: "pw",
    activeTasks: 0,
    role: mockRole(),
    company: mockCompany(),
    ...overrides,
  } as InternalUserDAO;
}

function createQueryBuilderMock() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),

    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<InternalUserDAO>>;
}

const TEST_HASHED_PASSWORD = process.env.TEST_HASHED_PASSWORD ?? "test_hash_value";

describe("InternalUserRepository", () => {
  let repo: InternalUserRepository;
  let typeOrmMock: jest.Mocked<Repository<InternalUserDAO>>;
  let qb: jest.Mocked<SelectQueryBuilder<InternalUserDAO>>;

  beforeEach(() => {
    qb = createQueryBuilderMock();

    typeOrmMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    } as any;

    repo = new InternalUserRepository(typeOrmMock as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should create and save a new user", async () => {
      const user = mockUser();
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
      const user = mockUser({ email: "ab.com" });
      qb.getOne.mockResolvedValue(user);

      const result = await repo.findByEmail("ab.com");

      expect(result).toEqual(user);
      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(internalUser.email) = LOWER(:email)",
        { email: "ab.com" }
      );
    });

    it("should include password when requested", async () => {
      const user = mockUser({ password: TEST_HASHED_PASSWORD });
      qb.getOne.mockResolvedValue(user);

      const result = await repo.findByEmail("ab.com", { withPassword: true });

      expect(qb.addSelect).toHaveBeenCalledWith("internalUser.password");
      expect(result).toEqual(user);
    });

    it("should return null if email does not exist", async () => {
      qb.getOne.mockResolvedValue(null);

      const result = await repo.findByEmail("no@no.com");

      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return a user if id exists", async () => {
      const user = mockUser();
      typeOrmMock.findOne.mockResolvedValue(user);

      const result = await repo.findById(1);

      expect(result).toEqual(user);
    });

    it("should return null if no user", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);

      const result = await repo.findById(99);

      expect(result).toBeNull();
    });
  });

  describe("fetchAll", () => {
    it("should return all users with relations", async () => {
      const users = [mockUser(), mockUser({ id: 2 })];
      typeOrmMock.find.mockResolvedValue(users);

      const result = await repo.fetchAll();

      expect(result).toEqual(users);
    });
  });

  describe("update", () => {
    it("should save and return user", async () => {
      const user = mockUser();
      typeOrmMock.save.mockResolvedValue(user);

      const result = await repo.update(user);

      expect(result).toEqual(user);
    });
  });

  describe("findByRoleId", () => {
    it("should return users with matching role", async () => {
      const users = [
        mockUser({ id: 1, role: mockRole({ id: 1 }) }),
        mockUser({ id: 2, role: mockRole({ id: 1 }) }),
      ];

      typeOrmMock.find.mockResolvedValue(users);

      const result = await repo.findByRoleId(1);

      expect(result).toEqual(users);
    });

    it("should return [] if none found", async () => {
      typeOrmMock.find.mockResolvedValue([]);

      const result = await repo.findByRoleId(99);

      expect(result).toEqual([]);
    });
  });

  describe("incrementActiveTasks", () => {
    it("should increment activeTasks", async () => {
      const qbLocal = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      typeOrmMock.createQueryBuilder.mockReturnValue(qbLocal as any);

      await repo.incrementActiveTasks(1);

      const fn = qbLocal.set.mock.calls[0][0].activeTasks;
      expect(fn()).toBe("activeTasks + 1");
    });
  });

  describe("decrementActiveTasks", () => {
    it("should decrement activeTasks but not below 0", async () => {
      const qbLocal = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };

      typeOrmMock.createQueryBuilder.mockReturnValue(qbLocal as any);

      await repo.decrementActiveTasks(1);

      const fn = qbLocal.set.mock.calls[0][0].activeTasks;
      expect(fn()).toBe("MAX(activeTasks - 1, 0)");
    });
  });

  describe("findByIdWithRoleAndOffice", () => {
    it("should return populated role+office", async () => {
      const user = mockUser({
        role: mockRole({ office: { id: 1 } }),
      });

      typeOrmMock.findOne.mockResolvedValue(user);

      const result = await repo.findByIdWithRoleAndOffice(1);

      expect(result).toEqual(user);
    });

    it("should return null if not found", async () => {
      typeOrmMock.findOne.mockResolvedValue(null);

      const result = await repo.findByIdWithRoleAndOffice(99);

      expect(result).toBeNull();
    });
  });

  describe("findExternalMaintainersByCompany", () => {
    it("should return maintainers ordered by active tasks", async () => {
      const maintainers = [
        mockUser({
          id: 1,
          activeTasks: 0,
          role: mockRole({ id: 28 }),
          company: mockCompany({ id: 5 }),
        }),
        mockUser({
          id: 2,
          activeTasks: 2,
          role: mockRole({ id: 28 }),
          company: mockCompany({ id: 5 }),
        }),
      ];

      typeOrmMock.find.mockResolvedValue(maintainers);

      const result = await repo.findExternalMaintainersByCompany(5);

      expect(result).toEqual(maintainers);
    });
  });
});
