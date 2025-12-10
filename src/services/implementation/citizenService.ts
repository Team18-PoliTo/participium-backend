import { CitizenMapper } from "../../mappers/CitizenMapper";
import { CitizenDTO } from "../../models/dto/CitizenDTO";
import { RegisterCitizenRequestDTO } from "../../models/dto/ValidRequestDTOs";
import CitizenRepository from "../../repositories/implementation/CitizenRepository";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ICitizenRepository } from "../../repositories/ICitizenRepository";
import { ICitizenService } from "../ICitizenService";
import { LoginRequestDTO } from "../../models/dto/LoginRequestDTO";
import MinIoService from "../MinIoService";
import { PROFILE_BUCKET } from "../../config/minioClient";

class CitizenService implements ICitizenService {
  static updateCitizen: any;
  constructor(
    private readonly citizenRepository: ICitizenRepository = new CitizenRepository()
  ) {}

  async register(registerData: RegisterCitizenRequestDTO): Promise<CitizenDTO> {
    const email = registerData.email.trim().toLowerCase();
    const username = registerData.username.trim().toLowerCase();

    const existingCitizenByEmail =
      await this.citizenRepository.findByEmail(email);
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

    return await CitizenMapper.toDTO(newCitizen);
  }

  async getCitizenById(id: number): Promise<CitizenDTO> {
    const citizen = await this.citizenRepository.findById(id);
    if (!citizen) {
      throw new Error("Citizen not found");
    }
    return await CitizenMapper.toDTO(citizen);
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
      {
        sub: citizen.id,
        kind: "citizen",
        email: citizen.email,
        status: citizen.status,
      },
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
      photoPath?: string | null;
    }
  ): Promise<CitizenDTO> {
    const citizen = await this.citizenRepository.findById(id);
    if (!citizen) throw new Error("Citizen not found");

    const normalize = (v: any) => {
      if (v === undefined) return undefined;
      if (v === "" || v === "null" || v === null) return null;
      return v;
    };

    const assignNormalized = (
      key: string,
      val: any,
      transform?: (v: any) => any
    ) => {
      if (val === undefined) return;
      const normalized = normalize(val);
      updatePayload[key] = transform ? transform(normalized) : normalized;
    };

    const deletePhotoIfExists = async () => {
      if (!citizen.accountPhotoUrl) return;
      try {
        await MinIoService.deleteFile(PROFILE_BUCKET, citizen.accountPhotoUrl);
      } catch (err: any) {
        console.warn(
          `[CitizenService] Failed to delete profile photo ${citizen.accountPhotoUrl}:`,
          err?.message || err
        );
      }
    };

    const updatePayload: any = {};

    assignNormalized("email", data.email, (v) => (v ? v.toLowerCase() : null));
    assignNormalized("username", data.username, (v) =>
      v ? v.toLowerCase() : null
    );
    assignNormalized("firstName", data.firstName);
    assignNormalized("lastName", data.lastName);
    assignNormalized("telegramUsername", data.telegramUsername);

    if (data.emailNotificationsEnabled !== null) {
      updatePayload.emailNotificationsEnabled = data.emailNotificationsEnabled;
    }

    // PHOTO SECTION (reduced complexity)
    if (data.photoPath !== undefined) {
      await deletePhotoIfExists();
      updatePayload.accountPhotoUrl = data.photoPath ?? null;
    }

    await this.citizenRepository.update(id, updatePayload);

    const updatedCitizen = await this.citizenRepository.findById(id);
    if (!updatedCitizen) throw new Error("Citizen not found after update");

    return await CitizenMapper.toDTO(updatedCitizen);
  }
}

export const citizenService = new CitizenService();
export default CitizenService;
