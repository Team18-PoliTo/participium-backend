jest.mock("bcrypt", () => ({
  __esModule: true,
  compare: jest.fn(async () => true),
  hash: jest.fn(async () => "hashed"),
  default: {
    compare: jest.fn(async () => true),
    hash: jest.fn(async () => "hashed"),
  },
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  sign: jest.fn(() => "jwt-token"),
  default: {
    sign: jest.fn(() => "jwt-token"),
  },
}));

import InternalUserService from "../../../src/services/internalUserService";
import { InternalUserMapper } from "../../../src/mappers/InternalUserMapper";
import {
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
} from "../../../src/models/dto/ValidRequestDTOs";
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("InternalUserService", () => {
  let userRepositoryMock: any;
  let roleRepositoryMock: any;
  let service: InternalUserService;

  beforeEach(() => {
    userRepositoryMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

    it("should throw if email already exists", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue({} as InternalUserDAO);
      await expect(service.register(dto)).rejects.toThrow(
        "InternalUser with this email already exists"
      );
    });

    it("should throw if default role not found", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.register(dto)).rejects.toThrow(
        "Default role not found"
      );
    });

    it("should create user successfully", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      roleRepositoryMock.findById.mockResolvedValue({ id: 0, name: "default" });
      userRepositoryMock.create.mockImplementation(
        async (user: InternalUserDAO) => ({ ...user, id: 1, status: "ACTIVE" })
      );

      const result = await service.register(dto);
      expect(result.id).toBe(1);
      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(result.status).toBe("ACTIVE");
    });
  });

  describe("update", () => {
    const updateDto: UpdateInternalUserRequestDTO = {
      newEmail: "new@b.com",
      newFirstName: "NewA",
      newLastName: "NewB",
    };

    it("should throw if user not found", async () => {
      userRepositoryMock.findById.mockResolvedValue(null);
      await expect(service.update(1, updateDto)).rejects.toThrow(
        "InternalUser not found"
      );
    });

    it("should throw if new email already used by another user", async () => {
      userRepositoryMock.findById.mockResolvedValue({
        id: 1,
        email: "a@b.com",
      } as InternalUserDAO);
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 2,
        email: "new@b.com",
      } as InternalUserDAO);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        "Email already in use by another user"
      );
    });

    it("should update user successfully", async () => {
      const dao = {
        id: 1,
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        status: "ACTIVE",
      } as InternalUserDAO;
      userRepositoryMock.findById.mockResolvedValue(dao);
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.update.mockImplementation(
        async (user: InternalUserDAO) => ({ ...user })
      );

      const result = await service.update(1, updateDto);
      expect(result.firstName).toBe("NewA");
      expect(result.lastName).toBe("NewB");
      expect(result.email).toBe("new@b.com");
    });

    it("should update partial fields if some are undefined", async () => {
      const dao = {
        id: 1,
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        status: "ACTIVE",
      } as InternalUserDAO;
      userRepositoryMock.findById.mockResolvedValue(dao);
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.update.mockImplementation(
        async (user: InternalUserDAO) => ({ ...user })
      );

      const partialUpdate = { newFirstName: "Partial" };
      const result = await service.update(1, partialUpdate as any);
      expect(result.firstName).toBe("Partial");
      expect(result.lastName).toBe("B");
      expect(result.email).toBe("a@b.com");
    });


    describe("fetchUsers", () => {
      beforeEach(() => {
        userRepositoryMock.fetchAll = jest.fn();
      });

      it("should return mapped list of users", async () => {
        const t1 = new Date("2024-01-02T03:04:05.000Z");
        const t2 = new Date("2024-01-03T10:20:30.000Z");

        const daoUsers: any[] = [
          {
            id: 1,
            email: "a@b.com",
            firstName: "A",
            lastName: "B",
            role: { role: "EMPLOYEE" },
            createdAt: t1,
            password: "hash",
            status: "ACTIVE",
          },
          {
            id: 2,
            email: "x@y.com",
            firstName: "X",
            lastName: "Y",
            role: { role: "ADMIN" },
            createdAt: t2,
            password: "hash2",
            status: "SUSPENDED",
          },
        ];

        (userRepositoryMock.fetchAll as jest.Mock).mockResolvedValue(daoUsers);

        const result = await service.fetchUsers();

        expect(userRepositoryMock.fetchAll).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
          expect.objectContaining({
            id: 1,
            email: "a@b.com",
            firstName: "A",
            lastName: "B",
            role: "EMPLOYEE",
            createdAt: t1,
            status: "ACTIVE",
          }),
          expect.objectContaining({
            id: 2,
            email: "x@y.com",
            firstName: "X",
            lastName: "Y",
            role: "ADMIN",
            createdAt: t2,
            status: "SUSPENDED",
          }),
        ]);
      });

      it("should return empty array when no users exist", async () => {
        (userRepositoryMock.fetchAll as jest.Mock).mockResolvedValue([]);

        const result = await service.fetchUsers();

        expect(userRepositoryMock.fetchAll).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
      });
    });
  });

  describe("disableById", () => {
    it("should mark user as deactivated", async () => {
      const dao = { id: 10, status: "ACTIVE" } as InternalUserDAO;
      userRepositoryMock.findById.mockResolvedValue(dao);
      userRepositoryMock.update.mockResolvedValue({ ...dao, status: "DEACTIVATED" });

      const result = await service.disableById(10);

      expect(result).toBe("ok");
      expect(userRepositoryMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DEACTIVATED" })
      );
    });

    it("should return not_found when user missing", async () => {
      userRepositoryMock.findById.mockResolvedValue(null);
      const result = await service.disableById(10);
      expect(result).toBe("not_found");
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
    });
  });
});