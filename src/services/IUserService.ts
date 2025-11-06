import {RegisterRequestDTO} from "../models/dto/RegisterRequestDTO";
import {UserDTO} from "../models/dto/UserDTO";
import {LoginRequestDTO} from "../models/dto/LoginRequestDTO";

export interface IUserService {
    register(registerData: RegisterRequestDTO): Promise<UserDTO>;
    login(loginData: LoginRequestDTO): Promise<{ token: string; user: UserDTO }>;
}