import { minioClient, MINIO_BUCKET } from "./minioClient";
import { AppDataSource } from "./database";
import { seedReports } from "../data/seed/seedReports";

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
    console.log("[MinIO] Buckets:", buckets.map(b => b.name));

    // Seed reports with images after MinIO is ready
    // Only seed if database is initialized
    if (AppDataSource.isInitialized) {
      const forceSeed = process.env.FORCE_SEED === 'true';
      await seedReports(AppDataSource, forceSeed);
    }

  } catch (error: any) {
    console.error("[MinIO] Initialization failed:", error);
  }
};