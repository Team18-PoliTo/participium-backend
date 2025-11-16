import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
import { CreateReportRequestDTO } from "../../models/dto/ValidRequestDTOs";
import { IReportRepository } from "../../repositories/IReportRepository";
import { ReportRepository } from "../../repositories/implementation/ReportRepository";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import MinIoService from "../MinIoService";
import { v4 as uuidv4 } from "uuid";
import { IReportService } from "../IReportService";
import { ReportStatus } from "../../constants/ReportStatus";
class ReportService implements IReportService {
  constructor(
    private reportRepository: IReportRepository = new ReportRepository(),
    private citizenRepository: ICitizenRepository = new CitizenRepository()
  ) {}

  async create(data: CreateReportRequestDTO, citizenId: number): Promise<ReportDTO> {
    const citizen = await this.citizenRepository.findById(citizenId);
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
      status: ReportStatus.PENDING_APPROVAL,
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

    const toBuffer = (payload: string | Buffer): Buffer =>
      Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "base64");

    if (data.binaryPhoto1) {
      const objectKey1 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto1.filename}`;
      uploadedPhotos.photo1 = await MinIoService.uploadFile(
        objectKey1,
        toBuffer(data.binaryPhoto1.data),
        data.binaryPhoto1.mimetype
      );
    }

    if (data.binaryPhoto2) {
      const objectKey2 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto2.filename}`;
      uploadedPhotos.photo2 = await MinIoService.uploadFile(
        objectKey2,
        toBuffer(data.binaryPhoto2.data),
        data.binaryPhoto2.mimetype
      );
    }

    if (data.binaryPhoto3) {
      const objectKey3 = `${pathPrefix}${uuidv4()}-${data.binaryPhoto3.filename}`;
      uploadedPhotos.photo3 = await MinIoService.uploadFile(
        objectKey3,
        toBuffer(data.binaryPhoto3.data),
        data.binaryPhoto3.mimetype
      );
    }

    if (uploadedPhotos.photo1) newReport.photo1 = uploadedPhotos.photo1;
    if (uploadedPhotos.photo2) newReport.photo2 = uploadedPhotos.photo2;
    if (uploadedPhotos.photo3) newReport.photo3 = uploadedPhotos.photo3;

    await this.reportRepository.update(newReport);

    return ReportMapper.toDTO(newReport);
  }

  async getReportsByStatus(status: string): Promise<ReportDTO[]> {
    const reports = await this.reportRepository.findByStatus(status);
    return reports.map((report) => ReportMapper.toDTO(report));
  }
}
export const reportService = new ReportService();
export default ReportService;
