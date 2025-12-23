import DelegatedReportDAO from "../models/dao/DelegatedReportDAO";
import DelegatedReportDTO from "../models/dto/DelegatedReportDTO";
import { ReportMapper } from "./ReportMapper";

class DelegatedReportMapper {
  static async toDTO(dao: DelegatedReportDAO): Promise<DelegatedReportDTO> {
    return {
      ...(await ReportMapper.toDTO(dao.report)),
      delegatedAt: dao.delegatedAt,
    };
  }
}

export default DelegatedReportMapper;
