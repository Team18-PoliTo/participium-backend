// Mock bcrypt before importing
const mockCompare = jest.fn();
const mockHash = jest.fn();

jest.mock("bcrypt", () => ({
  compare: (...args: any[]) => mockCompare(...args),
  hash: (...args: any[]) => mockHash(...args),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "jwt-token"),
}));

import InternalUserService from "../../../src/services/internalUserService";
import {
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
} from "../../../src/models/dto/ValidRequestDTOs";
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";

const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "pw";
const TEST_HASHED_PASSWORD = process.env.TEST_HASHED_PASSWORD ?? "hashed";

describe("InternalUserService", () => {
  let userRepositoryMock: any;
  let roleRepositoryMock: any;
  let companyRepositoryMock: any;
  let internalUserRoleRepositoryMock: any;
  let service: InternalUserService;

  const baseDao: InternalUserDAO = {
    id: 2,
    email: "a@b.com",
    firstName: "A",
    lastName: "B",
    password: "hashed",
    status: "ACTIVE",
    activeTasks: 0,
    createdAt: new Date(),
    roles: [],
    company: null,
    comments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCompare.mockImplementation(() => Promise.resolve(true));
    mockHash.mockImplementation(() => Promise.resolve("hashed_password"));

    userRepositoryMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      fetchAll: jest.fn(),
    };

    roleRepositoryMock = {
      findById: jest.fn(),
    };

    companyRepositoryMock = {
      findById: jest.fn(),
    };

    internalUserRoleRepositoryMock = {
      deleteByInternalUserId: jest.fn(),
    };

    service = new InternalUserService(
      userRepositoryMock,
      roleRepositoryMock,
      companyRepositoryMock,
      internalUserRoleRepositoryMock
    );
  });

  describe("register", () => {
    const dto: RegisterInternalUserRequestDTO = {
      email: "a@b.com",
      password: TEST_PASSWORD,
      firstName: "A",
      lastName: "B",
    };

    it("throws when email already exists", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue({} as InternalUserDAO);
      await expect(service.register(dto)).rejects.toThrow(
        "InternalUser with this email already exists"
      );
    });

    it("throws when default role missing", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.register(dto)).rejects.toThrow(
        "Default role not found"
      );
    });

    it("creates user with default role", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({ id: 0, role: "TBD" });
      userRepositoryMock.create.mockImplementation(async (user: any) => ({
        ...user,
        id: 1,
        createdAt: new Date(),
      }));

      const result = await service.register(dto);

      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ email: "a@b.com" }));
    });
  });

  describe("update", () => {
    it("throws when user missing", async () => {
      userRepositoryMock.findById.mockResolvedValue(null);
      await expect(
        service.update(2, {} as UpdateInternalUserRequestDTO)
      ).rejects.toThrow("InternalUser not found");
    });

    it("throws when new email used by another user", async () => {
      userRepositoryMock.findById.mockResolvedValue(baseDao);
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 3,
      } as InternalUserDAO);
      await expect(
        service.update(2, { email: "exists@city.com" } as any)
      ).rejects.toThrow("Email already in use by another user");
    });

    it("updates basic fields", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.save.mockImplementation(async (user: any) => ({
        ...user,
      }));

      const result = await service.update(2, {
        email: "new@city.com",
        firstName: "New",
        lastName: "Name",
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          email: "new@city.com",
          firstName: "New",
          lastName: "Name",
        })
      );
    });

    it("allows single assignment when role exists", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({ id: 5, role: "ADMIN" });
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );

      userRepositoryMock.save.mockImplementation(async (user: any) => user);

      const result = await service.update(2, { roleIds: [5] } as any);

      expect(roleRepositoryMock.findById).toHaveBeenCalledWith(5);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe("ADMIN");
    });

    it("throws when target role not found", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );
      roleRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.update(2, { roleIds: [7] } as any)).rejects.toThrow(
        "Role not found: 7"
      );
    });

    it("should throw when external maintainer role assigned without company", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );

      await expect(service.update(2, { roleIds: [28] } as any)).rejects.toThrow(
        "External Maintainers must be assigned to a company"
      );
    });

    it("should throw when company assigned but role is not external maintainer", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({ id: 5, role: "Admin" });
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );

      await expect(
        service.update(2, { roleIds: [5], companyId: 10 } as any)
      ).rejects.toThrow();
    });

    it("should throw when company not found", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });
      companyRepositoryMock.findById.mockResolvedValue(null);
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );

      await expect(
        service.update(2, { roleIds: [28], companyId: 999 } as any)
      ).rejects.toThrow("Company not found");
    });

    it("should update user with company when role is external maintainer", async () => {
      const company = { id: 5, name: "FixIt Inc", email: "fixit@test.com" };
      const updatedUser = { ...baseDao, company };

      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });
      companyRepositoryMock.findById.mockResolvedValue(company);
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );
      userRepositoryMock.save.mockResolvedValue(updatedUser);

      const result = await service.update(2, {
        roleIds: [28],
        companyId: 5,
      } as any);

      expect(companyRepositoryMock.findById).toHaveBeenCalledWith(5);
      expect(userRepositoryMock.save).toHaveBeenCalled();
    });

    it("should update user without company when companyId is undefined", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      internalUserRoleRepositoryMock.deleteByInternalUserId.mockResolvedValue(
        undefined
      );
      userRepositoryMock.save.mockImplementation(async (user: any) => ({
        ...user,
      }));

      const result = await service.update(2, {
        email: "updated@city.com",
      } as any);

      expect(result).toEqual(
        expect.objectContaining({ email: "updated@city.com" })
      );
      expect(userRepositoryMock.save).toHaveBeenCalled();
    });
  });

  describe("fetchUsers", () => {
    it("returns mapped users", async () => {
      const t = new Date();
      userRepositoryMock.fetchAll.mockResolvedValue([
        {
          id: 1,
          email: "staff@city.com",
          firstName: "Staff",
          lastName: "One",
          createdAt: t,
          roles: [{ role: { role: "ADMIN" } }],
          status: "ACTIVE",
          activeTasks: 0,
          password: "hashed",
          comments: [],
        },
      ]);

      const result = await service.fetchUsers();
      expect(result).toEqual([
        expect.objectContaining({ id: 1, status: "ACTIVE" }),
      ]);
    });

    it("returns empty list when repository empty", async () => {
      userRepositoryMock.fetchAll.mockResolvedValue([]);
      const result = await service.fetchUsers();
      expect(result).toEqual([]);
    });
  });

  describe("disableById", () => {
    it("marks user as deactivated", async () => {
      const dao = {
        id: 10,
        status: "ACTIVE",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
        password: "hashed",
        activeTasks: 0,
        createdAt: new Date(),
        roles: [],
        comments: [],
      } as InternalUserDAO;
      userRepositoryMock.findById.mockResolvedValue(dao);
      userRepositoryMock.save.mockResolvedValue({
        ...dao,
        status: "DEACTIVATED",
      });

      const result = await service.disableById(10);

      expect(result).toBe("ok");
      expect(userRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DEACTIVATED" })
      );
    });

    it("returns not_found when user missing", async () => {
      userRepositoryMock.findById.mockResolvedValue(null);
      const result = await service.disableById(10);
      expect(result).toBe("not_found");
    });
  });

  describe("login", () => {
    const baseUser: any = {
      id: 9,
      email: "internal@city.com",
      password: TEST_HASHED_PASSWORD,
      status: "ACTIVE",
      roles: [],
    };

    it("throws when user cannot be found", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: "test@test.com", password: TEST_PASSWORD })
      ).rejects.toThrow("Invalid credentials");
    });

    it("throws when status is not ACTIVE", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue({
        ...baseUser,
        status: "SUSPENDED",
      });
      await expect(
        service.login({ email: "test@test.com", password: TEST_PASSWORD })
      ).rejects.toThrow("Invalid credentials");
    });
  });
});
