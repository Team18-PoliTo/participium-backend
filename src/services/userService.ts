import { UserMapper } from "../mappers/UserMapper";
import { UserDTO } from "../models/dto/UserDTO";
import { RegisterRequestDTO } from "../models/dto/RegisterRequestDTO";
import UserDAO from "../models/dao/UserDAO";
import UserRepository from "../repositories/UserRepository";
import * as bcrypt from "bcrypt";

interface IUserRepository {
  create(user: Partial<UserDAO>): Promise<UserDAO>;
  findByEmail(email: string): Promise<UserDAO | null>;
  findByUsername(username: string): Promise<UserDAO | null>;
  fetchAll():Promise<UserDAO[]>;
}

class UserService {
  constructor(private userRepository: IUserRepository = new UserRepository()) {}

  async register(registerData: RegisterRequestDTO): Promise<UserDTO> {
    // Check if email already exists
    const existingUserByEmail = await this.userRepository.findByEmail(registerData.email);
    if (existingUserByEmail) {
      throw new Error("User with this email already exists");
    }

    // Check if username already exists
    const existingUserByUsername = await this.userRepository.findByUsername(registerData.username);
    if (existingUserByUsername) {
      throw new Error("User with this username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    // Create user
    const newUser = await this.userRepository.create({
      email: registerData.email,
      username: registerData.username,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      password: hashedPassword
    });

    return UserMapper.toDTO(newUser);
  }
}

export const userService = new UserService();
export default UserService;

