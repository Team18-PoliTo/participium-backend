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
import InternalUserRoleDAO from "../models/dao/InternalUserRoleDAO";
import { EXTERNAL_MAINTAINER_ROLE_ID } from "../constants/StatusTransitions";
import { InternalUserRoleRepository } from "../repositories/implementation/InternalUserRoleRepository";

interface IInternalUserRepository {
  create(user: Partial<InternalUserDAO>): Promise<InternalUserDAO>;
  findByEmail(
    email: string,
    opts?: { withPassword?: boolean }
  ): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  save(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO[]>;
}

class InternalUserService {
  constructor(
    private readonly userRepository: IInternalUserRepository = new InternalUserRepository(),
    private readonly roleRepository: RoleRepository = new RoleRepository(),
    private readonly companyRepository: CompanyRepository = new CompanyRepository(),
    private readonly internalUserRoleRepository = new InternalUserRoleRepository()
  ) {}

  async register(
    data: RegisterInternalUserRequestDTO
  ): Promise<InternalUserDTO> {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingInternalUserByEmail =
      await this.userRepository.findByEmail(normalizedEmail);
    if (existingInternalUserByEmail) {
      throw new Error("InternalUser with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const role = await this.roleRepository.findById(0);
    if (!role) {
      throw new Error("Default role not found");
    }

    const userRole = new InternalUserRoleDAO();
    userRole.role = role;

    const newInternalUser = await this.userRepository.create({
      email: normalizedEmail,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
      roles: [userRole],
      status: "ACTIVE",
      activeTasks: 0,
    });

    return InternalUserMapper.toDTO(newInternalUser);
  }

  async update(
    id: number,
    data: UpdateInternalUserRequestDTO
  ): Promise<InternalUserDTO> {
    console.log("➡️ UPDATE internal user", { id, data });

    const internalUserDAO = await this.userRepository.findById(id);
    if (!internalUserDAO) {
      throw new Error("InternalUser not found");
    }

    if (data.firstName !== undefined) {
      internalUserDAO.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      internalUserDAO.lastName = data.lastName;
    }

    if (data.email !== undefined) {
      const newEmail = data.email.trim().toLowerCase();
      const existingUser = await this.userRepository.findByEmail(newEmail);
      if (existingUser && existingUser.id !== id) {
        throw new Error("Email already in use by another user");
      }
      internalUserDAO.email = newEmail;
    }

    if (data.roleIds !== undefined) {
      await this.internalUserRoleRepository.deleteByInternalUserId(
        internalUserDAO.id
      );

      internalUserDAO.roles = [];

      for (const roleId of data.roleIds) {
        const role = await this.roleRepository.findById(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }

        const userRole = new InternalUserRoleDAO();
        userRole.internalUser = internalUserDAO;
        userRole.role = role;

        internalUserDAO.roles.push(userRole);
      }
    }

    const isExternalMaintainer = internalUserDAO.roles.some(
      (r) => r.role.id === EXTERNAL_MAINTAINER_ROLE_ID
    );

    if (isExternalMaintainer) {
      if (!data.companyId) {
        throw new Error("External Maintainers must be assigned to a company");
      }

      const company = await this.companyRepository.findById(data.companyId);
      if (!company) {
        throw new Error("Company not found");
      }

      internalUserDAO.company = company;
    }

    const updatedInternalUser = await this.userRepository.save(internalUserDAO);

    return isExternalMaintainer
      ? ExternalMaintainerMapper.toDTO(updatedInternalUser)
      : InternalUserMapper.toDTO(updatedInternalUser);
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
    await this.userRepository.save(user);

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
        roles: user.roles?.map((r) => r.id) ?? [],
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
