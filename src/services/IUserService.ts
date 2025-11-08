import { RegisterRequestDTO } from "../models/dto/ValidRequestDTOs";
import { UserDTO } from "../models/dto/UserDTO";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";

export interface IUserService {
    register(registerData: RegisterRequestDTO): Promise<UserDTO>;
    login(loginData: LoginRequestDTO): Promise<{ token: string; user: UserDTO }>;
    disableUserById(id: number): Promise<'ok' | 'not_found'>;
}