import { CompanyDTO } from "./CompanyDTO";

export class InternalUserDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  activeTasks: number;
  createdAt: Date;
  role: number | string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}

export class ExternalMaintainerDTO extends InternalUserDTO {
  company: CompanyDTO;
}