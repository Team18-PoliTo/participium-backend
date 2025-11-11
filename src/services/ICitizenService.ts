import { RegisterCitizenRequestDTO } from "../models/dto/ValidRequestDTOs";
import { CitizenDTO } from "../models/dto/CitizenDTO";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";

export interface ICitizenService {
    register(registerData: RegisterCitizenRequestDTO): Promise<CitizenDTO>;
    login(loginData: LoginRequestDTO): Promise<{ access_token: string; token_type: "bearer" }>;
}