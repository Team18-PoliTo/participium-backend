import { ReportMapper } from "../../mappers/ReportMapper";
import { ReportDTO } from "../../models/dto/ReportDTO";
import { CreateReportRequestDTO } from "../../models/dto/ValidRequestDTOs";
import { IReportRepository } from "../../repositories/IReportRepository";
import { ReportRepository } from "../../repositories/implementation/ReportRepository";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";

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
    // TODO: call minIO service to upload photos on these paths

    await this.reportRepository.update(newReport);

    return ReportMapper.toDTO(newReport);
  }
}
