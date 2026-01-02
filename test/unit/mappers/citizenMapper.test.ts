const mockGetPresignedUrl = jest.fn();

jest.mock("../../../src/services/MinIoService", () => ({
  __esModule: true,
  default: {
    getPresignedUrl: (...args: any[]) => mockGetPresignedUrl(...args),
  },
}));

jest.resetModules();

import { CitizenMapper } from "../../../src/mappers/CitizenMapper";
import CitizenDAO from "../../../src/models/dao/CitizenDAO";

describe("CitizenMapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("toDTO", () => {
    it("should map citizen without accountPhotoUrl", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        createdAt: new Date(),
        accountPhotoUrl: null,
        telegramUsername: null,
        emailNotificationsEnabled: null,
        lastLoginAt: null,
      } as CitizenDAO;

      const result = await CitizenMapper.toDTO(citizenDAO);

      expect(result).toEqual({
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        isEmailVerified: false,
        createdAt: citizenDAO.createdAt,
        accountPhoto: undefined,
        telegramUsername: undefined,
        emailNotificationsEnabled: undefined,
        lastLoginAt: undefined,
      });
      expect(mockGetPresignedUrl).not.toHaveBeenCalled();
    });

    it("should map citizen with accountPhotoUrl and generate presigned URL", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        createdAt: new Date(),
        accountPhotoUrl: "citizens/1/profile.jpg",
        telegramUsername: null,
        emailNotificationsEnabled: null,
        lastLoginAt: null,
      } as CitizenDAO;

      mockGetPresignedUrl.mockResolvedValue(
        "http://presigned-url.com/profile.jpg"
      );

      const result = await CitizenMapper.toDTO(citizenDAO);

      expect(result.accountPhoto).toBe("http://presigned-url.com/profile.jpg");
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        "citizens/1/profile.jpg",
        expect.any(String)
      );
    });

    it("should handle when presigned URL generation returns empty string", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        createdAt: new Date(),
        accountPhotoUrl: "citizens/1/profile.jpg",
        telegramUsername: null,
        emailNotificationsEnabled: null,
        lastLoginAt: null,
      } as CitizenDAO;

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      mockGetPresignedUrl.mockResolvedValue("");

      const result = await CitizenMapper.toDTO(citizenDAO);

      // Empty string is falsy, so the warning is logged, but accountPhoto is still ""
      expect(result.accountPhoto).toBe("");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to generate presigned URL for citizens/1/profile.jpg"
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle error when generating presigned URL", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        createdAt: new Date(),
        accountPhotoUrl: "citizens/1/profile.jpg",
        telegramUsername: null,
        emailNotificationsEnabled: null,
        lastLoginAt: null,
      } as CitizenDAO;

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const error = new Error("MinIO error");
      mockGetPresignedUrl.mockRejectedValue(error);

      const result = await CitizenMapper.toDTO(citizenDAO);

      expect(result.accountPhoto).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Error generating presigned URL for citizens/1/profile.jpg:",
        error
      );

      consoleWarnSpy.mockRestore();
    });

    it("should map citizen with all optional fields", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: "ACTIVE",
        createdAt: new Date(),
        accountPhotoUrl: null,
        telegramUsername: "@testuser",
        emailNotificationsEnabled: true,
        lastLoginAt: new Date("2024-01-01"),
      } as CitizenDAO;

      const result = await CitizenMapper.toDTO(citizenDAO);

      expect(result.telegramUsername).toBe("@testuser");
      expect(result.emailNotificationsEnabled).toBe(true);
      expect(result.lastLoginAt).toEqual(new Date("2024-01-01"));
    });

    it("should use default status PENDING when status is null", async () => {
      const citizenDAO = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        status: null,
        createdAt: new Date(),
        accountPhotoUrl: null,
        telegramUsername: null,
        emailNotificationsEnabled: null,
        lastLoginAt: null,
      } as any;

      const result = await CitizenMapper.toDTO(citizenDAO);

      expect(result.status).toBe("PENDING");
    });
  });
});
