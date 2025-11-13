jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from "bcrypt";
import { AppDataSource, closeDatabase, initializeDatabase } from "../../../src/config/database";
import InternalUserDAO from "../../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../../src/models/dao/RoleDAO";

describe("database configuration", () => {
  const buildRoleRepo = (store: Map<number, any>) => {
    return {
      findOneBy: jest.fn(async (condition: Partial<RoleDAO>) => {
        if (Object.prototype.hasOwnProperty.call(condition, "id")) {
          const id = condition.id as number | undefined;
          if (typeof id === "undefined") {
            return {};
          }
          return store.get(id) ?? null;
        }
        return null;
      }),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => {
        if (typeof data.id === "number") {
          store.set(data.id, data);
        }
        return data;
      }),
    };
  };

  const buildInternalRepo = (users: any[]) => {
    return {
      findOneBy: jest.fn(async (condition: Partial<InternalUserDAO>) => {
        if (Object.prototype.hasOwnProperty.call(condition, "email")) {
          return (
            users.find((user) => user.email === condition.email) ?? null
          );
        }
        return null;
      }),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => {
        const saved = {
          id: data.id ?? users.length + 1,
          ...data,
        };
        users.push(saved);
        return saved;
      }),
    };
  };

  const mockGetRepository = (roleRepo: any, internalRepo: any) => {
    return jest
      .spyOn(AppDataSource, "getRepository")
      .mockImplementation(((entity: any) => {
        if (entity === RoleDAO) {
          return roleRepo;
        }
        if (entity === InternalUserDAO) {
          return internalRepo;
        }
        throw new Error("Unexpected repository request");
      }) as any);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockReset();
  });

  it("seeds default roles and admin when missing", async () => {
    const rolesStore = new Map<number, any>();
    const users: any[] = [];
    const roleRepo = buildRoleRepo(rolesStore);
    const internalRepo = buildInternalRepo(users);

    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    mockGetRepository(roleRepo, internalRepo);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initializeDatabase();

    expect(AppDataSource.initialize).toHaveBeenCalled();
    expect(roleRepo.save).toHaveBeenCalled();
    expect(Array.from(rolesStore.keys())).toEqual(
      expect.arrayContaining([0, 1, 2, 3, 4])
    );
    expect(internalRepo.save).toHaveBeenCalled();
    expect(users[0]).toMatchObject({
      email: "admin@admin.com",
      status: "ACTIVE",
    });
    expect(typeof users[0].password).toBe("string");
    expect(logSpy).toHaveBeenCalledWith("Database connection established.");
  });

  it("skips seeding when data already exists", async () => {
    const rolesStore = new Map<number, any>([
      [0, { id: 0, role: "Unassigned" }],
      [1, { id: 1, role: "ADMIN" }],
      [2, { id: 2, role: "Municipal Administrator" }],
      [3, { id: 3, role: "Municipal Public Relations Officer" }],
      [4, { id: 4, role: "Technical Office Staff" }],
    ]);
    const existingAdmin = {
      id: 42,
      email: "admin@admin.com",
      role: rolesStore.get(1),
    };
    const users: any[] = [existingAdmin];
    const roleRepo = buildRoleRepo(rolesStore);
    const internalRepo = buildInternalRepo(users);

    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    mockGetRepository(roleRepo, internalRepo);

    await initializeDatabase();

    expect(roleRepo.save).not.toHaveBeenCalled();
    expect(internalRepo.save).not.toHaveBeenCalled();
  });

  it("logs and exits when initialization throws", async () => {
    const error = new Error("init failed");
    jest
      .spyOn(AppDataSource, "initialize")
      .mockImplementation(() => {
        throw error;
      });

    const errorSpy = jest.spyOn(console, "error").mockImplementation();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as any);

    await initializeDatabase();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error while opening the database: ",
      error
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs errors during seeding without crashing", async () => {
    const rolesStore = new Map<number, any>();
    const users: any[] = [];
    const roleRepo = buildRoleRepo(rolesStore);
    const internalRepo = buildInternalRepo(users);
    const seedError = new Error("seed failed");

    roleRepo.save = jest.fn(async () => {
      throw seedError;
    });

    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    mockGetRepository(roleRepo, internalRepo);

    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await initializeDatabase();

    expect(errorSpy).toHaveBeenCalledWith(seedError);
  });

  it("logs when admin role cannot be retrieved", async () => {
    const rolesStore = new Map<number, any>();
    const users: any[] = [];
    const roleRepo = buildRoleRepo(rolesStore);
    const internalRepo = buildInternalRepo(users);

    const originalFindOneBy = roleRepo.findOneBy.bind(roleRepo);
    roleRepo.findOneBy = jest.fn(async (condition: Partial<RoleDAO>) => {
      if (condition && Object.prototype.hasOwnProperty.call(condition, "id") && condition.id === 1) {
        return null;
      }
      return originalFindOneBy(condition);
    });

    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    mockGetRepository(roleRepo, internalRepo);

    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await initializeDatabase();

    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "Admin role not found." }));
    expect(internalRepo.save).not.toHaveBeenCalled();
  });

  describe("closeDatabase", () => {
    it("logs when destroy succeeds", async () => {
      jest.spyOn(AppDataSource, "destroy").mockResolvedValue(undefined as never);
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      await closeDatabase();

      expect(AppDataSource.destroy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith("Database connection closed.");
    });

    it("logs error when destroy fails", async () => {
      const error = new Error("close failed");
      jest.spyOn(AppDataSource, "destroy").mockRejectedValue(error);
      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      await closeDatabase();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error while closing the database: ",
        error
      );
    });
  });
});
