import * as fs from "node:fs";
import * as path from "node:path";
import { DataSource } from "typeorm";
import CitizenDAO from "../../models/dao/CitizenDAO";
import MinIoService from "../../services/MinIoService";
import { PROFILE_BUCKET } from "../../config/minioClient";

/**
 * Seeds profile photos for citizens that have accountPhotoUrl set in the database.
 * This function should be called after MinIO is initialized and the database is ready.
 *
 * @param dataSource - The TypeORM DataSource instance
 */
export async function seedCitizenProfiles(
  dataSource: DataSource
): Promise<void> {
  const citizenRepo = dataSource.getRepository(CitizenDAO);

  // Find all citizens with accountPhotoUrl set
  const citizensWithPhotos = await citizenRepo.find({
    where: {},
  });

  // Filter to only those with accountPhotoUrl and ensure type safety
  const citizensToProcess = citizensWithPhotos.filter(
    (c): c is CitizenDAO & { accountPhotoUrl: string } => !!c.accountPhotoUrl
  );

  if (citizensToProcess.length === 0) {
    console.log("[Seed] No citizens with profile photos to seed.");
    return;
  }

  // Determine profile photos directory (handle both src and dist)
  let profilePhotosDir = path.join(__dirname, "profile-photos");
  if (!fs.existsSync(profilePhotosDir) && __dirname.includes("/dist/")) {
    profilePhotosDir = path.join(
      __dirname,
      "../../../../src/data/seed/profile-photos"
    );
  }

  if (!fs.existsSync(profilePhotosDir)) {
    console.log(
      `[Seed] Profile photos directory not found at: ${profilePhotosDir}. Skipping profile photo seeding.`
    );
    return;
  }

  console.log(
    `[Seed] Processing ${citizensToProcess.length} citizens with profile photos...`
  );
  console.log("[Seed] Looking for profile photos in:", profilePhotosDir);

  let successCount = 0;

  for (const citizen of citizensToProcess) {
    // Type guard: ensure accountPhotoUrl is defined
    if (!citizen.accountPhotoUrl) {
      continue;
    }

    try {
      // Try multiple possible filenames
      // 1. Extract filename from accountPhotoUrl (e.g., "profile.jpg" from "citizens/5/profile.jpg")
      const urlParts = citizen.accountPhotoUrl.split("/");
      const expectedFilename = urlParts[urlParts.length - 1]; // "profile.jpg"
      
      // 2. Also try citizen ID-based filenames (e.g., "5.jpg", "5.png")
      const possibleFilenames = [
        expectedFilename, // "profile.jpg"
        `${citizen.id}.jpg`,
        `${citizen.id}.png`,
        `${citizen.id}.jpeg`,
        `profile.jpg`,
        `profile.png`,
        `profile.jpeg`,
      ];

      let photoPath: string | null = null;
      let foundFilename: string | null = null;

      for (const filename of possibleFilenames) {
        const testPath = path.join(profilePhotosDir, filename);
        if (fs.existsSync(testPath)) {
          photoPath = testPath;
          foundFilename = filename;
          break;
        }
      }

      if (!photoPath) {
        console.warn(
          `[Seed] Profile photo not found for citizen ${citizen.id} (${citizen.email}). Tried: ${possibleFilenames.join(", ")}`
        );
        continue;
      }

      try {
        const imageBuffer = fs.readFileSync(photoPath);
        const ext = path.extname(foundFilename!).toLowerCase();
        const mimeType =
          ext === ".png"
            ? "image/png"
            : ext === ".jpeg" || ext === ".jpg"
            ? "image/jpeg"
            : "image/jpeg"; // default

        // Use the accountPhotoUrl as the MinIO path
        const minioPath = citizen.accountPhotoUrl;

        // Upload to MinIO
        await MinIoService.uploadFile(
          PROFILE_BUCKET,
          minioPath,
          imageBuffer,
          mimeType
        );

        console.log(
          `[Seed] Uploaded profile photo for citizen ${citizen.id} (${citizen.email}): ${foundFilename} -> ${minioPath}`
        );
        successCount++;
      } catch (uploadError) {
        console.error(
          `[Seed] Failed to upload profile photo for citizen ${citizen.id}:`,
          uploadError
        );
      }
    } catch (error) {
      console.error(
        `[Seed] Failed to process profile photo for citizen ${citizen.id}:`,
        error
      );
    }
  }

  console.log(
    `[Seed] Successfully uploaded ${successCount}/${citizensToProcess.length} profile photos.`
  );
}

export default seedCitizenProfiles;

