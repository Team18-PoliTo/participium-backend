import { InternalUserMapper } from "../mappers/InternalUserMapper";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import {
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import InternalUserDAO from "../models/dao/InternalUserDAO";
import InternalUserRepository from "../repositories/InternalUserRepository";
import * as bcrypt from "bcrypt";
import RoleRepository from "../repositories/RoleRepository";
import jwt from "jsonwebtoken";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";

interface IInternalUserRepository {
  create(user: Partial<InternalUserDAO>): Promise<InternalUserDAO>;
  findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  update(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO []>
}

class InternalUserService {
  constructor(
    private userRepository: IInternalUserRepository = new InternalUserRepository(),
    private roleRepository: RoleRepository = new RoleRepository()
  ) {}

  async register(
    data: RegisterInternalUserRequestDTO
  ): Promise<InternalUserDTO> {
    const normalizedEmail = data.email.trim().toLowerCase();
    // Check if email already exists
    const existingInternalUserByEmail = await this.userRepository.findByEmail(
      normalizedEmail
    );
    if (existingInternalUserByEmail) {
      throw new Error("InternalUser with this email already exists");
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // deafult role at registration time
    const role = await this.roleRepository.findById(0);
    if (!role) {
      throw new Error("Default role not found");
    }
    // Create user
    const newInternalUser = await this.userRepository.create({
      email: normalizedEmail,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
      role: role,
      status: "ACTIVE",
    });

    return InternalUserMapper.toDTO(newInternalUser);
  }

  async update(
    id: number,
    data: UpdateInternalUserRequestDTO,
  ): Promise<InternalUserDTO> {
    const internalUserDAO = await this.userRepository.findById(id);
    if (!internalUserDAO) {
      throw new Error("InternalUser not found");
    }
    // Update fields
    if (data.newFirstName !== undefined) {
      internalUserDAO.firstName = data.newFirstName;
    }
    if (data.newLastName !== undefined) {
      internalUserDAO.lastName = data.newLastName;
    }
    if (data.newEmail !== undefined) {
      const newEmail = data.newEmail.trim().toLowerCase();
      const existingUser = await this.userRepository.findByEmail(newEmail);
      if (existingUser && existingUser.id !== id) {
        throw new Error("Email already in use by another user");
      }
      internalUserDAO.email = newEmail;
    }
    const updatedInternalUser = await this.userRepository.update(
      internalUserDAO
    );
    return InternalUserMapper.toDTO(updatedInternalUser);
  }

  async fetchUsers(): Promise<InternalUserDTO []>{
    const users = await this.userRepository.fetchAll();
    return users.map((user) => InternalUserMapper.toDTO(user));
  }

  async disableById(id: number): Promise<'ok' | 'not_found'> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return 'not_found';
    }

    user.status = "DEACTIVATED";
    await this.userRepository.update(user);

    return 'ok';
  }

  async login({
    email,
    password,
  }: LoginRequestDTO): Promise<{ access_token: string; token_type: "bearer" }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail, {
      withPassword: true,
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const status = user.status ?? "ACTIVE";
    if (status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const token = jwt.sign(
      {
        sub: user.id,
        kind: "internal",
        role: (user.role as any)?.role,
        email: user.email,
        status,
      },
      secret,
      { expiresIn: "1h" }
    );

    return { access_token: token, token_type: "bearer" };
  }
}

export const internalUserService = new InternalUserService();

export default InternalUserService;
