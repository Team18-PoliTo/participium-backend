import { minioClient, MINIO_BUCKET } from "./minioClient";

export const initMinio = async () => {
  const PROFILE_BUCKET = process.env.MINIO_PROFILE_BUCKET || "profile-photos";

  const bucketsToCreate = [MINIO_BUCKET, PROFILE_BUCKET];

  try {
    for (const bucket of bucketsToCreate) {
      const exists = await minioClient.bucketExists(bucket).catch(() => false);

      if (!exists) {
        console.log(`[MinIO] Bucket "${bucket}" does not exist. Creating...`);
        await minioClient.makeBucket(bucket, "us-east-1");
        console.log(`[MinIO] Created bucket: ${bucket}`);
      } else {
        console.log(`[MinIO] Bucket already exists: ${bucket}`);
      }
    }

    const buckets = await minioClient.listBuckets();
    console.log("[MinIO] Buckets:", buckets.map(b => b.name));

  } catch (error: any) {
    console.error("[MinIO] Initialization failed:", error);
  }
};