import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
import { CreateReportRequestDTO } from "../../models/dto/ValidRequestDTOs";
import { IReportRepository } from "../../repositories/IReportRepository";
import { ReportRepository } from "../../repositories/implementation/ReportRepository";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import MinIoService from "../MinIoService";
class ReportService {
  constructor(
    private reportRepository: IReportRepository = new ReportRepository(),
    private citizenRepository: ICitizenRepository = new CitizenRepository()
  ) {}

  async create(data: CreateReportRequestDTO): Promise<ReportDTO> {
    const citizen = await this.citizenRepository.findById(data.citizenId);
    if (!citizen) {
      throw new Error("Citizen not found");
    }

    // Create report
    const newReport = await this.reportRepository.create({
      citizen: citizen,
      title: data.title,
      description: data.description,
      category: data.category,
      createdAt: new Date(),
      location: JSON.stringify(data.location),
    });
    // Creates the ObjectKey to be used in minIO
    const pathPrefix = `citizens/${citizen.id}/reports/${newReport.id}/`;

    newReport.photo1 = pathPrefix + data.binaryPhoto1.filename;
    if (data.binaryPhoto2) {
      newReport.photo2 = pathPrefix + data.binaryPhoto2.filename;
    }
    if (data.binaryPhoto3) {
      newReport.photo3 = pathPrefix + data.binaryPhoto3.filename;
    }
      
    const uploadedPhotos: string[] = [];

    const photos = [
      data.binaryPhoto1,
      data.binaryPhoto2,
      data.binaryPhoto3,
    ].filter((p): p is NonNullable<typeof p> => !!p); // remove undefined

    for (const photo of photos) {
      const objectKey = pathPrefix + photo.filename;

      // Upload file binary data to MinIO
      await MinIoService.uploadFile(objectKey, photo.data, photo.mimetype);

      uploadedPhotos.push(objectKey);
    }

    // Assign uploaded MinIO object keys to the report entity
    if (uploadedPhotos[0]) newReport.photo1 = uploadedPhotos[0];
    if (uploadedPhotos[1]) newReport.photo2 = uploadedPhotos[1];
    if (uploadedPhotos[2]) newReport.photo3 = uploadedPhotos[2];

    await this.reportRepository.update(newReport);

    return ReportMapper.toDTO(newReport);
  }
}
export const reportService = new ReportService();
export default ReportService;
