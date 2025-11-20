jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import ReportService from "../../../src/services/implementation/reportService";
import MinIoService from "../../../src/services/MinIoService";
import { v4 as uuidv4 } from "uuid";

describe("ReportService", () => {
  const citizen = { id: 10 } as any;
  const category = { id: 1, name: "Road", description: "Road issues" } as any;

  const baseReport = {
    id: 42,
    citizen,
    title: "Initial",
    description: "Initial desc",
    category,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    location: JSON.stringify({ latitude: 0, longitude: 0 }),
    photo1: undefined,
    photo2: undefined,
    photo3: undefined,
  } as any;

  const buildService = () => {
    const reportRepository = {
      create: jest.fn().mockResolvedValue({ ...baseReport }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const citizenRepository = {
      findById: jest.fn().mockResolvedValue(citizen),
    };
    const categoryRepository = {
      findByName: jest.fn().mockResolvedValue(category),
    };

    return {
      service: new ReportService(
          reportRepository as any,
          citizenRepository as any,
          categoryRepository as any
      ),
      reportRepository,
      citizenRepository,
      categoryRepository,
    };
  };

  let uploadSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    uploadSpy = jest
        .spyOn(MinIoService, "uploadFile")
        .mockResolvedValue(undefined as any);
    (uuidv4 as jest.Mock).mockImplementation(() => "uuid");
  });

  afterEach(() => {
    uploadSpy.mockRestore();
  });

  it("creates report, uploads provided photos, and returns DTO", async () => {
    uploadSpy
        .mockResolvedValueOnce("object/photo1.png" as any)
        .mockResolvedValueOnce("object/photo2.png" as any)
        .mockResolvedValueOnce("object/photo3.png" as any);

    const { service, reportRepository, citizenRepository } = buildService();

    const result = await service.create(
        {
          title: "Broken light",
          description: "Lamp not working",
          category: "Infrastructure",
          location: { latitude: 45, longitude: 9 },
          binaryPhoto1: {
            filename: "photo1.png",
            data: Buffer.from("primary"),
            size: 10,
            mimetype: "image/png",
          },
          binaryPhoto2: {
            filename: "photo2.png",
            data: Buffer.from("secondary"),
            size: 8,
            mimetype: "image/png",
          },
          binaryPhoto3: {
            filename: "photo3.png",
            data: Buffer.from("tertiary"),
            size: 6,
            mimetype: "image/png",
          },
        } as any,
        citizen.id
    );

    expect(citizenRepository.findById).toHaveBeenCalledWith(citizen.id);
    expect(reportRepository.create).toHaveBeenCalled();
    expect(uploadSpy).toHaveBeenCalledTimes(3);
    expect(reportRepository.update).toHaveBeenCalled();

    const updatedReport = (reportRepository.update as jest.Mock).mock.calls[0][0];
    expect(updatedReport.photo1).toBe("object/photo1.png");
    expect(updatedReport.photo2).toBe("object/photo2.png");
    expect(updatedReport.photo3).toBe("object/photo3.png");

    expect(result).toMatchObject({
      id: baseReport.id,
      citizenId: citizen.id,
      title: baseReport.title,
      category: baseReport.category,
      location: { latitude: 0, longitude: 0 },
    });
    expect(result.photos).toEqual([
      "object/photo1.png",
      "object/photo2.png",
      "object/photo3.png",
    ]);
  });

  it("handles optional photos and converts base64 payloads", async () => {
    uploadSpy.mockResolvedValue("object/photo1.png" as any);
    const { service, reportRepository } = buildService();

    const payload = {
      title: "Pothole",
      description: "Huge one",
      category: "Road",
      location: { latitude: 1, longitude: 2 },
      binaryPhoto1: {
        filename: "p1.png",
        data: "Zm9v", // base64
        size: 4,
        mimetype: "image/png",
      },
    } as any;

    await service.create(payload, citizen.id);

    const bufferArg = uploadSpy.mock.calls[0][1] as Buffer;
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(bufferArg.toString("base64")).toBe(payload.binaryPhoto1.data);
    expect(reportRepository.update).toHaveBeenCalled();
  });

  it("throws when citizen cannot be located", async () => {
    const { service, citizenRepository } = buildService();
    citizenRepository.findById.mockResolvedValue(null);

    await expect(
        service.create(
            {
              title: "Any",
              description: "Any",
              category: "Road",
              location: { latitude: 0, longitude: 0 },
              binaryPhoto1: {
                filename: "a",
                data: "Zm9v",
                size: 1,
                mimetype: "image/png",
              },
            } as any,
            999
        )
    ).rejects.toThrow("Citizen not found");
  });

  it("throws when category cannot be located", async () => {
    const { service, categoryRepository } = buildService();
    categoryRepository.findByName.mockResolvedValue(null);

    await expect(
        service.create(
            {
              title: "Broken light",
              description: "Lamp not working",
              category: "MissingCategory",
              location: { latitude: 45, longitude: 9 },
            } as any,
            citizen.id
        )
    ).rejects.toThrow("Category not found: MissingCategory");
  });


  it("does not upload files when no photos are provided", async () => {
    const { service } = buildService();

    await expect(
        service.create(
            {
              title: "No photos",
              description: "Just text",
              category: "Road",
              location: { latitude: 3, longitude: 4 },
            } as any,
            citizen.id
        )
    ).rejects.toThrow();

    expect(uploadSpy).not.toHaveBeenCalled();
  });

});