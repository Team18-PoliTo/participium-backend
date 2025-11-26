import {CitizenMapper} from "../../mappers/CitizenMapper";
import {CitizenDTO} from "../../models/dto/CitizenDTO";
import {RegisterCitizenRequestDTO} from "../../models/dto/ValidRequestDTOs";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {ICitizenRepository} from "../../repositories/ICitizenRepository";
import {ICitizenService} from "../ICitizenService";
import {LoginRequestDTO} from "../../models/dto/LoginRequestDTO";
import MinIoService from "../MinIoService";

class CitizenService implements ICitizenService {
  constructor(
    private citizenRepository: ICitizenRepository = new CitizenRepository()
  ) {}

  async register(
    registerData: RegisterCitizenRequestDTO
  ): Promise<CitizenDTO> {
    const email = registerData.email.trim().toLowerCase();
    const username = registerData.username.trim().toLowerCase();

    const existingCitizenByEmail = await this.citizenRepository.findByEmail(
      email
    );
    if (existingCitizenByEmail)
      throw new Error("Citizen with this email already exists");

    const existingCitizenByUsername =
      await this.citizenRepository.findByUsername(username);
    if (existingCitizenByUsername)
      throw new Error("Citizen with this username already exists");

    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    const newCitizen = await this.citizenRepository.create({
      email,
      username,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      password: hashedPassword,
      status: "ACTIVE",
    });

    return CitizenMapper.toDTO(newCitizen);
  }

  async login({
    email,
    password,
  }: LoginRequestDTO): Promise<{ access_token: string; token_type: "bearer" }> {
    const normalizedEmail = email.trim().toLowerCase();
    const citizen = await this.citizenRepository.findByEmail(normalizedEmail, {
      withPassword: true,
    });
    if (!citizen) throw new Error("Invalid credentials");

    const status = citizen.status ?? "ACTIVE";
    if (status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, citizen.password);
    if (!ok) {
      await this.citizenRepository.update(citizen.id, {
        failedLoginAttempts: (citizen.failedLoginAttempts ?? 0) + 1,
      });
      throw new Error("Invalid credentials");
    }

    await this.citizenRepository.update(citizen.id, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    });

    const secret = process.env.JWT_SECRET || "dev-secret";
    const token = jwt.sign(
      { sub: citizen.id, kind: "citizen", email: citizen.email, status: citizen.status },
      secret,
      { expiresIn: "1h" }
    );

    return { access_token: token, token_type: "bearer" };
  }

  async updateCitizen(
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
  ): Promise<CitizenDTO> {

    const citizen = await this.citizenRepository.findById(id);
    if (!citizen) {
      throw new Error("Citizen not found");
    }

    const normalize = (v: any) => {
      if (v === undefined) return undefined;
      if (v === "" || v === "null" || v === null) return null;
      return v;
    };

    const updatePayload: any = {};

    if (data.email !== undefined) {
      const normalized = normalize(data.email);
      updatePayload.email = normalized ? normalized.toLowerCase() : null;
    }

    if (data.username !== undefined) {
      const normalized = normalize(data.username);
      updatePayload.username = normalized ? normalized.toLowerCase() : null;
    }

    if (data.firstName !== undefined)
      updatePayload.firstName = normalize(data.firstName);

    if (data.lastName !== undefined)
      updatePayload.lastName = normalize(data.lastName);

    if (data.telegramUsername !== undefined)
      updatePayload.telegramUsername = normalize(data.telegramUsername);

    if (data.emailNotificationsEnabled !== undefined)
      updatePayload.emailNotificationsEnabled = data.emailNotificationsEnabled;

    if (data.photoFile) {
      updatePayload.accountPhotoUrl = await MinIoService.uploadUserProfilePhoto(id, data.photoFile);
    }

    await this.citizenRepository.update(id, updatePayload);

    const updatedCitizen = await this.citizenRepository.findById(id);
    if (!updatedCitizen) {
      throw new Error("Citizen not found after update");
    }

    return CitizenMapper.toDTO(updatedCitizen);
  }

}

export const citizenService = new CitizenService();
export default CitizenService;


