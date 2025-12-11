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

describe("InternalUserService", () => {
  let userRepositoryMock: any;
  let roleRepositoryMock: any;
  let service: InternalUserService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default return values for mocks
    mockCompare.mockImplementation(() => Promise.resolve(true));
    mockHash.mockImplementation(() => Promise.resolve("hashed_password"));

    userRepositoryMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      fetchAll: jest.fn(),
    };

    roleRepositoryMock = {
      findById: jest.fn(),
    };

    service = new InternalUserService(userRepositoryMock, roleRepositoryMock);
  });

  describe("register", () => {
    const dto: RegisterInternalUserRequestDTO = {
      email: "a@b.com",
      password: "pw",
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
        status: "ACTIVE",
        role: { id: 0, role: "TBD" },
      }));

      const result = await service.register(dto);

      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ id: 1, email: "a@b.com", status: "ACTIVE" })
      );
    });
  });

  describe("update", () => {
    const baseDao: InternalUserDAO = {
      id: 2,
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      status: "ACTIVE",
      role: { id: 0, role: "TBD" } as any,
    } as InternalUserDAO;

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
        service.update(2, { newEmail: "exists@city.com" })
      ).rejects.toThrow("Email already in use by another user");
    });

    it("updates basic fields", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.update.mockImplementation(async (user: any) => ({
        ...user,
      }));

      const result = await service.update(2, {
        newEmail: "new@city.com",
        newFirstName: "New",
        newLastName: "Name",
      });

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
      userRepositoryMock.update.mockImplementation(async (user: any) => ({
        ...user,
      }));

      const result = await service.update(2, { newRoleId: 5 });

      expect(roleRepositoryMock.findById).toHaveBeenCalledWith(5);
      expect(result.role).toBe("ADMIN");
    });

    it("rejects role change when already assigned", async () => {
      userRepositoryMock.findById.mockResolvedValue({
        ...baseDao,
        role: { id: 1, role: "ADMIN" },
      });

      await expect(service.update(2, { newRoleId: 4 })).rejects.toThrow(
        "Role already assigned"
      );
    });

    it("throws when target role not found", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.update(2, { newRoleId: 7 })).rejects.toThrow(
        "Role not found"
      );
    });

    it("should throw when external maintainer role assigned without company", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });

      await expect(
        service.update(2, { newRoleId: 28, newCompanyId: null as any })
      ).rejects.toThrow("External Maintainers must be assigned to a company");
    });

    it("should throw when company assigned but role is not external maintainer", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({ id: 5, role: "Admin" });

      await expect(
        service.update(2, { newRoleId: 5, newCompanyId: 10 })
      ).rejects.toThrow(
        "Only External Maintainers (role 28) can be assigned to a company"
      );
    });

    it("should throw when company not found", async () => {
      const companyRepository = {
        findById: jest.fn(),
      } as any;
      (service as any).companyRepository = companyRepository;

      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });
      companyRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(2, { newRoleId: 28, newCompanyId: 999 })
      ).rejects.toThrow("Company not found");
    });

    it("should update user with company when role is external maintainer", async () => {
      const companyRepository = {
        findById: jest.fn(),
      } as any;
      (service as any).companyRepository = companyRepository;

      const company = { id: 5, name: "FixIt Inc", email: "fixit@test.com" };
      const updatedUser = {
        ...baseDao,
        role: { id: 28, role: "External Maintainer" },
        company: company,
      };

      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({
        id: 28,
        role: "External Maintainer",
      });
      companyRepository.findById.mockResolvedValue(company);
      userRepositoryMock.update.mockResolvedValue(updatedUser);

      const result = await service.update(2, {
        newRoleId: 28,
        newCompanyId: 5,
      });

      expect(companyRepository.findById).toHaveBeenCalledWith(5);
      expect(userRepositoryMock.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 2,
        company: expect.objectContaining({ id: 5, name: "FixIt Inc" }),
      });
    });

    it("should update user without company when newCompanyId is undefined", async () => {
      userRepositoryMock.findById.mockResolvedValue({ ...baseDao });
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.update.mockImplementation(async (user: any) => ({
        ...user,
      }));

      const result = await service.update(2, {
        newFirstName: "Updated",
        newCompanyId: undefined,
      });

      expect(result).toMatchObject({
        firstName: "Updated",
      });
      // Should use InternalUserMapper, not ExternalMaintainerMapper
      expect(userRepositoryMock.update).toHaveBeenCalled();
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
          role: { role: "ADMIN" },
          status: "ACTIVE",
        },
      ]);

      const result = await service.fetchUsers();
      expect(result).toEqual([
        expect.objectContaining({ id: 1, role: "ADMIN", status: "ACTIVE" }),
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
      const dao = { id: 10, status: "ACTIVE" } as InternalUserDAO;
      userRepositoryMock.findById.mockResolvedValue(dao);
      userRepositoryMock.update.mockResolvedValue({
        ...dao,
        status: "DEACTIVATED",
      });

      const result = await service.disableById(10);

      expect(result).toBe("ok");
      expect(userRepositoryMock.update).toHaveBeenCalledWith(
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
      password: "hashed",
      status: "ACTIVE",
    };

    it("throws when user cannot be found", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: "missing@city.com", password: "x" })
      ).rejects.toThrow("Invalid credentials");
    });

    it("throws when status is not ACTIVE", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue({
        ...baseUser,
        status: "SUSPENDED",
        role: { role: "ADMIN" },
      });
      await expect(
        service.login({ email: baseUser.email, password: "x" })
      ).rejects.toThrow("Invalid credentials");
    });
  });
});
