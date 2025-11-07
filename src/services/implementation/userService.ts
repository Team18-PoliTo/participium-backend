import { UserMapper } from "../../mappers/UserMapper";
import { UserDTO } from "../../models/dto/UserDTO";
import { RegisterRequestDTO } from "../../models/dto/ValidRequestDTOs";
import UserRepository from "../../repositories/implementation/UserRepository";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { IUserRepository } from "../../repositories/IUserRepository";
import {IUserService} from "../IUserService";
import {LoginRequestDTO} from "../../models/dto/LoginRequestDTO";


class UserService implements IUserService {
  constructor(private userRepository: IUserRepository = new UserRepository()) {}

  async register(registerData: RegisterRequestDTO): Promise<UserDTO> {
    const email = registerData.email.trim().toLowerCase();
    const username = registerData.username.trim().toLowerCase();

    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) throw new Error("User with this email already exists");

    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) throw new Error("User with this username already exists");

    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    const newUser = await this.userRepository.create({
      email,
      username,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      password: hashedPassword,
    });

    return UserMapper.toDTO(newUser);
  }

  async login({ email, password }: LoginRequestDTO): Promise<{ token: string; user: UserDTO }> {
    const user = await this.userRepository.findByEmail(email, { withPassword: true });
    if (!user) throw new Error("Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await this.userRepository.update(user.id, { failedLoginAttempts: (user.failedLoginAttempts ?? 0) + 1 });
      throw new Error("Invalid credentials");
    }

    await this.userRepository.update(user.id, { failedLoginAttempts: 0, lastLoginAt: new Date() });

    const secret = process.env.JWT_SECRET || "dev-secret";
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: "1h" }
    );

    return { token, user: UserMapper.toDTO(user) };
  }
}

export const userService = new UserService();
export default UserService;


