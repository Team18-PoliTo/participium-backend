import { InternalUserMapper } from "../mappers/InternalUserMapper";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import { RegisterInternalUserRequestDTO } from "../models/dto/RegisterInternalUserRequestDTO";
import InternalUserDAO from "../models/dao/InternalUserDAO";
import InternalUserRepository from "../repositories/InternalUserRepository";
import * as bcrypt from "bcrypt";
import RoleRepository from "../repositories/RoleRepository";

interface IInternalUserRepository {
  create(user: Partial<InternalUserDAO>): Promise<InternalUserDAO>;
  findByEmail(email: string): Promise<InternalUserDAO | null>;
}

class InternalUserService {
  constructor(
    private userRepository: IInternalUserRepository = new InternalUserRepository(),
    private roleRepository: RoleRepository = new RoleRepository()
  ) {}

  async register(
    data: RegisterInternalUserRequestDTO
  ): Promise<InternalUserDTO> {
    // Check if email already exists
    const existingInternalUserByEmail = await this.userRepository.findByEmail(
      data.email
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
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
      role: role,
    });

    return InternalUserMapper.toDTO(newInternalUser);
  }
}

export const userService = new InternalUserService();

export default InternalUserService;
