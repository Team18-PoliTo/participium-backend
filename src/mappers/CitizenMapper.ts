import CitizenDAO from "../models/dao/CitizenDAO";
import { CitizenDTO } from "../models/dto/CitizenDTO";
import MinIoService from "../services/MinIoService";
import { PROFILE_BUCKET } from "../config/minioClient";

export class CitizenMapper {
  /**
   * Convert CitizenDAO to CitizenDTO
   * If accountPhotoUrl exists, converts it to a presigned URL
   * Returns field as "accountPhoto" to match PATCH /me endpoint naming
   */
  static async toDTO(citizenDAO: CitizenDAO): Promise<CitizenDTO> {
    let accountPhoto: string | undefined = undefined;
    
    // If accountPhotoUrl exists, convert it to a presigned URL
    // Profile photos are stored in PROFILE_BUCKET
    if (citizenDAO.accountPhotoUrl) {
      try {
        accountPhoto = await MinIoService.getPresignedUrl(citizenDAO.accountPhotoUrl, PROFILE_BUCKET);
        // If presigned URL generation fails, accountPhoto will be undefined
        if (!accountPhoto) {
          console.warn(`Failed to generate presigned URL for ${citizenDAO.accountPhotoUrl}`);
        }
      } catch (error) {
        console.warn(`Error generating presigned URL for ${citizenDAO.accountPhotoUrl}:`, error);
      }
    }

    return {
      id: citizenDAO.id,
      email: citizenDAO.email,
      username: citizenDAO.username,
      firstName: citizenDAO.firstName,
      lastName: citizenDAO.lastName,
      status: citizenDAO.status ?? "ACTIVE",
      createdAt: citizenDAO.createdAt,
      accountPhoto, // Use "accountPhoto" to match PATCH /me field name
      // Convert null to undefined for optional fields
      telegramUsername: citizenDAO.telegramUsername ?? undefined,
      emailNotificationsEnabled: citizenDAO.emailNotificationsEnabled ?? undefined,
      lastLoginAt: citizenDAO.lastLoginAt ?? undefined,
    };
  }
}