import {
  ExternalMaintainerMapper,
  InternalUserMapper,
} from "../mappers/InternalUserMapper";
import { InternalUserDTO } from "../models/dto/InternalUserDTO";
import {
  RegisterInternalUserRequestDTO,
  UpdateInternalUserRequestDTO,
} from "../models/dto/ValidRequestDTOs";
import InternalUserDAO from "../models/dao/InternalUserDAO";
import InternalUserRepository from "../repositories/InternalUserRepository";
import * as bcrypt from "bcrypt";
import RoleRepository from "../repositories/implementation/RoleRepository";
import jwt from "jsonwebtoken";
import { LoginRequestDTO } from "../models/dto/LoginRequestDTO";
import CompanyRepository from "../repositories/implementation/CompanyRepository";

interface IInternalUserRepository {
  create(user: Partial<InternalUserDAO>): Promise<InternalUserDAO>;
  findByEmail(
    email: string,
    opts?: { withPassword?: boolean }
  ): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  update(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO[]>;
}

class InternalUserService {
  constructor(
    private userRepository: IInternalUserRepository = new InternalUserRepository(),
    private roleRepository: RoleRepository = new RoleRepository(),
    private companyRepository: CompanyRepository = new CompanyRepository()
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
      activeTasks: 0,
    });

    return InternalUserMapper.toDTO(newInternalUser);
  }

  async update(
    id: number,
    data: UpdateInternalUserRequestDTO
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
    if (data.newRoleId !== undefined) {
      const currentRoleId = (internalUserDAO.role as any)?.id;
      if (currentRoleId !== 0 || data.newRoleId === currentRoleId) {
        throw new Error("Role already assigned");
      }
      const newRole = await this.roleRepository.findById(data.newRoleId);
      if (!newRole) {
        throw new Error("Role not found");
      }
      internalUserDAO.role = newRole;
    }
    if (data.newCompanyId !== undefined) {
      // validates that external maintainers have a company assigned
      if (data.newRoleId === 28 && !data.newCompanyId) {
        throw new Error("External Maintainers must be assigned to a company");
      }

      // validates that users with a company are external maintainers
      if (data.newCompanyId && data.newRoleId !== 28) {
        throw new Error(
          "Only External Maintainers (role 28) can be assigned to a company"
        );
      }

      // validate company exists if provided
      let company = null;
      if (data.newCompanyId) {
        company = await this.companyRepository.findById(data.newCompanyId);
        if (!company) {
          throw new Error("Company not found");
        }
      }
      const externalMaintainer = internalUserDAO;
      externalMaintainer.company = company!;
      const updatedInternalUser = await this.userRepository.update(
        externalMaintainer
      );
      return ExternalMaintainerMapper.toDTO(updatedInternalUser);
    } else {
      const updatedInternalUser = await this.userRepository.update(
        internalUserDAO
      );
      return InternalUserMapper.toDTO(updatedInternalUser);
    }
  }

  async fetchUsers(): Promise<InternalUserDTO[]> {
    const users = await this.userRepository.fetchAll();
    return users.map((user) => InternalUserMapper.toDTO(user));
  }

  async disableById(id: number): Promise<"ok" | "not_found"> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return "not_found";
    }

    user.status = "DEACTIVATED";
    await this.userRepository.update(user);

    return "ok";
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
