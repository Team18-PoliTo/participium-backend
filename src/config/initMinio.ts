import { minioClient, MINIO_BUCKET } from "./minioClient";
import { AppDataSource } from "./database";
import { seedReports } from "../data/seed/seedReports";
import { seedCitizenProfiles } from "../data/seed/seedCitizenProfiles";

export const initMinio = async () => {
  const PROFILE_BUCKET = process.env.MINIO_PROFILE_BUCKET || "profile-photos";

  const bucketsToCreate = [MINIO_BUCKET, PROFILE_BUCKET];

  try {
    for (const bucket of bucketsToCreate) {
      const exists = await minioClient.bucketExists(bucket).catch(() => false);

      if (exists) {
        console.log(`[MinIO] Bucket already exists: ${bucket}`);
        continue;
      }
      console.log(`[MinIO] Bucket "${bucket}" does not exist. Creating...`);
      await minioClient.makeBucket(bucket, "us-east-1");
      console.log(`[MinIO] Created bucket: ${bucket}`);
    }

    const buckets = await minioClient.listBuckets();
    console.log(
      "[MinIO] Buckets:",
      buckets.map((b) => b.name)
    );
  } catch (error: any) {
    console.error("[MinIO] Initialization failed:", error);
  } finally {
    // Always attempt to seed reports once DB is ready,
    // even if MinIO init failed (uploads will be skipped per-image on error)
    if (AppDataSource.isInitialized) {
      const forceSeed = process.env.FORCE_SEED === "true";
      console.log(
        `[Seed] Starting report seeding (forceSeed=${forceSeed}). MinIO may be unavailable, uploads will be skipped.`
      );
      await seedReports(AppDataSource, forceSeed);

      // Seed citizen profile photos
      console.log(
        `[Seed] Starting citizen profile photo seeding. MinIO may be unavailable, uploads will be skipped.`
      );
      await seedCitizenProfiles(AppDataSource);
    } else {
      console.warn("[Seed] Skipped: AppDataSource not initialized.");
    }
  }
};
