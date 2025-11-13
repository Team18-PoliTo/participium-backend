import { minioClient, MINIO_BUCKET } from "./minioClient";

export const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET).catch(() => false);

    if (!exists) {
      console.log(`[MinIO] Bucket "${MINIO_BUCKET}" does not exist. Creating...`);
      await minioClient.makeBucket(MINIO_BUCKET, "us-east-1");
      console.log(`[MinIO] Created bucket: ${MINIO_BUCKET}`);
    } else {
      console.log(`[MinIO] Bucket already exists: ${MINIO_BUCKET}`);
    }

    const buckets = await minioClient.listBuckets();
    console.log("[MinIO] Buckets:", buckets.map(b => b.name));
  } catch (error: any) {
    if (error.code === "BucketAlreadyOwnedByYou" || error.code === "BucketAlreadyExists") {
      console.log(`[MinIO] Bucket "${MINIO_BUCKET}" already exists.`);
    } else {
      console.error("[MinIO] Initialization failed:", error);
    }
  }
};