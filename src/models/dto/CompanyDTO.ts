import { ExternalMantainerDTO } from "./InternalUserDTO";
import { CategoryDTO } from "./ReportDTO";

export class CompanyDTO {
    id: number;
    name: string;
    contactEmail: string | null;
    description: string | null;
    categories?: CategoryDTO[];
    employees?: ExternalMantainerDTO[];
  }
