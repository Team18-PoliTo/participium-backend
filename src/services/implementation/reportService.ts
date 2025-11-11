import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
import { CreateReportRequestDTO } from "../../models/dto/ValidRequestDTOs";
import { IReportRepository } from "../../repositories/IReportRepository";
import { ReportRepository } from "../../repositories/implementation/ReportRepository";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import MinIoService from "../MinIoService";
import { v4 as uuidv4 } from "uuid";
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
      
    const uploadedPhotos: { [key: string]: string } = {};

    if (data.binaryPhoto1) {
      const objectKey1 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto1.filename}`;
      uploadedPhotos.photo1 = await MinIoService.uploadFile(
        objectKey1,
        data.binaryPhoto1.data,
        data.binaryPhoto1.mimetype
      );
    }

    if (data.binaryPhoto2) {
      const objectKey2 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto2.filename}`;
      uploadedPhotos.photo2 = await MinIoService.uploadFile(
        objectKey2,
        data.binaryPhoto2.data,
        data.binaryPhoto2.mimetype
      );
    }

    if (data.binaryPhoto3) {
      const objectKey3 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto3.filename}`;
      uploadedPhotos.photo3 = await MinIoService.uploadFile(
        objectKey3,
        data.binaryPhoto3.data,
        data.binaryPhoto3.mimetype
      );
    }

    if (uploadedPhotos.photo1) newReport.photo1 = uploadedPhotos.photo1;
    if (uploadedPhotos.photo2) newReport.photo2 = uploadedPhotos.photo2;
    if (uploadedPhotos.photo3) newReport.photo3 = uploadedPhotos.photo3;

    await this.reportRepository.update(newReport);

    return ReportMapper.toDTO(newReport);
  }
}
export const reportService = new ReportService();
export default ReportService;
