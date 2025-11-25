import { RegisterCitizenRequestDTO } from "../models/dto/ValidRequestDTOs";
import { CitizenDTO } from "../models/dto/CitizenDTO";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";

export interface ICitizenService {
    register(registerData: RegisterCitizenRequestDTO): Promise<CitizenDTO>;
    login(loginData: LoginRequestDTO): Promise<{ access_token: string; token_type: "bearer" }>;
    updateCitizen(
        id: number,
        data: {
            email?: string | null;
            username?: string | null;
            firstName?: string | null;
            lastName?: string | null;
            telegramUsername?: string | null;
            emailNotificationsEnabled?: boolean;
            photoFile?: Express.Multer.File | null;
        }
    ): Promise<CitizenDTO>;
}