import { RegisterCitizenRequestDTO } from "../models/dto/ValidRequestDTOs";
import { CitizenDTO } from "../models/dto/CitizenDTO";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";

export interface ICitizenService {
  register(registerData: RegisterCitizenRequestDTO): Promise<CitizenDTO>;
  login(
    loginData: LoginRequestDTO
  ): Promise<{ access_token: string; token_type: "bearer" }>;
  getCitizenById(id: number): Promise<CitizenDTO>;
  updateCitizen(
    id: number,
    data: {
      email?: string | null;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      telegramUsername?: string | null;
      emailNotificationsEnabled?: boolean;
      photoPath?: string;
    }
  ): Promise<CitizenDTO>;
  verifyEmail(
    email: string,
    code: string
  ): Promise<{ success: boolean; message: string }>;
  resendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }>;
}
