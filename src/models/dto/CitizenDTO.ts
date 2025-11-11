export class CitizenDTO {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Date;
}


