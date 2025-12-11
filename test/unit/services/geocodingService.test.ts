const mockAxiosGet = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockAxiosGet(...args),
  },
}));

jest.resetModules();

import { GeocodingService } from "../../../src/services/GeocodingService";

describe("GeocodingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAddress", () => {
    it("should return formatted address with road and house number", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            road: "Main Street",
            house_number: "123",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBe("Main Street 123");
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "https://nominatim.openstreetmap.org/reverse?lat=45&lon=9&format=json&addressdetails=1",
        {
          headers: { "User-Agent": "Participium App - Polito Project" },
        }
      );
    });

    it("should return address with road only (no house number)", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            road: "Main Street",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBe("Main Street");
    });

    it("should use pedestrian if road is not available", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            pedestrian: "Pedestrian Way",
            house_number: "456",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBe("Pedestrian Way 456");
    });

    it("should use footway if road and pedestrian are not available", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            footway: "Footpath",
            house_number: "789",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBe("Footpath 789");
    });

    it("should return null if road starts with digit", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            road: "123 Street",
            house_number: "1",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null if road starts with underscore", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            road: "_Private Road",
            house_number: "1",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null if address is null", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: null,
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null if address is missing", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {},
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null if no valid road/pedestrian/footway", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            house_number: "123",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null on axios error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Network error"));

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });

    it("should return null if line is empty after trimming", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          address: {
            road: "   ",
            house_number: "",
          },
        },
      });

      const result = await GeocodingService.getAddress(45.0, 9.0);

      expect(result).toBeNull();
    });
  });
});
