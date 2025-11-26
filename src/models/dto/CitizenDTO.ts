export class CitizenDTO {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Date;
  accountPhoto?: string; // Presigned URL if photo exists (matches PATCH /me field name)
  telegramUsername?: string;
  emailNotificationsEnabled?: boolean;
  lastLoginAt?: Date;
}


