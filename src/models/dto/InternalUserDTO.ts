export class InternalUserDTO {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  role: number | string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}
