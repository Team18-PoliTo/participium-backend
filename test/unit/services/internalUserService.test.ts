import InternalUserService from "../../../src/services/internalUserService";
import { InternalUserMapper } from "../../../src/mappers/InternalUserMapper";
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
        async (user: InternalUserDAO) => ({ ...user, id: 1 })
      );

      const result = await service.register(dto);
      expect(result.id).toBe(1);
      expect(userRepositoryMock.create).toHaveBeenCalled();
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
  });

  describe('disableById', () => {
    it('when user exists -> calls findById(id), sets deletedAt and returns ok', async () => {
      // подменяем "сейчас", чтобы проверить точное значение deletedAt
      const fixed = new Date('2024-01-02T03:04:05.000Z');
      jest.useFakeTimers().setSystemTime(fixed);

      userRepositoryMock.findById.mockResolvedValueOnce({ id: 123 } as InternalUserDAO);
      userRepositoryMock.update.mockResolvedValueOnce({});

      const res = await service.disableById(123);

      expect(userRepositoryMock.findById).toHaveBeenCalledWith(123);
      expect(userRepositoryMock.update).toHaveBeenCalledTimes(1);

      const updateArg = userRepositoryMock.update.mock.calls[0][0] as InternalUserDAO;
      expect(updateArg).toEqual(expect.objectContaining({ id: 123, deletedAt: expect.any(Date) }));
      expect(updateArg.deletedAt!.toISOString()).toBe(fixed.toISOString());

      expect(res).toBe('ok');

      jest.useRealTimers();
    });

    it('when user does not exist -> returns not_found and does not call update', async () => {
      userRepositoryMock.findById.mockResolvedValueOnce(null);

      const res = await service.disableById(555);

      expect(userRepositoryMock.findById).toHaveBeenCalledWith(555);
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
      expect(res).toBe('not_found');
    });
  });
});