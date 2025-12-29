import { CompanyDTO } from "./CompanyDTO";

export class RoleDTO {
  id: number;
  name: string;
  officeId: number | null;
}

export class InternalUserDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  activeTasks: number;
  createdAt: Date;
  roles: RoleDTO[];
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}

export class ExternalMaintainerDTO extends InternalUserDTO {
  company: CompanyDTO;
}
