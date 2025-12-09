import {
  AppDataSource,
  closeDatabase,
  initializeDatabase,
} from "../../../src/config/database";

describe("database configuration", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("initializes database and runs migrations", async () => {
    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    jest
      .spyOn(AppDataSource, "synchronize")
      .mockResolvedValue(undefined as never);
    const runMigrationsSpy = jest
      .spyOn(AppDataSource, "runMigrations")
      .mockResolvedValue([] as never);

    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initializeDatabase();

    expect(AppDataSource.initialize).toHaveBeenCalled();
    expect(AppDataSource.synchronize).toHaveBeenCalled();
    expect(runMigrationsSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Database connection established.");
    expect(logSpy).toHaveBeenCalledWith("Database schema synchronized.");
    expect(logSpy).toHaveBeenCalledWith("Seed data migrations have been run.");
  });

  it("runs migrations even if data exists (migrations handle idempotency)", async () => {
    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    jest
      .spyOn(AppDataSource, "synchronize")
      .mockResolvedValue(undefined as never);
    const runMigrationsSpy = jest
      .spyOn(AppDataSource, "runMigrations")
      .mockResolvedValue([] as never);

    await initializeDatabase();

    expect(runMigrationsSpy).toHaveBeenCalled();
  });

  it("logs and exits when initialization throws", async () => {
    const error = new Error("init failed");
    jest.spyOn(AppDataSource, "initialize").mockImplementation(() => {
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

  it("logs errors during migrations without crashing", async () => {
    const migrationError = new Error("migration failed");

    jest
      .spyOn(AppDataSource, "initialize")
      .mockResolvedValue(AppDataSource as never);
    jest
      .spyOn(AppDataSource, "synchronize")
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(AppDataSource, "runMigrations")
      .mockRejectedValue(migrationError);

    const errorSpy = jest.spyOn(console, "error").mockImplementation();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as any);

    await initializeDatabase();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error while opening the database: ",
      migrationError
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // This test is no longer relevant - admin seeding is now handled by migrations
  // which are run separately and have their own error handling

  describe("closeDatabase", () => {
    it("logs when destroy succeeds", async () => {
      jest
        .spyOn(AppDataSource, "destroy")
        .mockResolvedValue(undefined as never);
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
