export class CitizenDTO {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  isEmailVerified: boolean;
  createdAt: Date;
  accountPhoto?: string; // Presigned URL if photo exists (matches PATCH /me field name)
  telegramUsername?: string;
  emailNotificationsEnabled?: boolean;
  lastLoginAt?: Date;
}
