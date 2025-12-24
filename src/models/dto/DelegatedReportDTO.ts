import { ReportDTO } from "./ReportDTO";

export default interface DelegatedReportDTO extends ReportDTO {
  delegatedAt: Date;
}
