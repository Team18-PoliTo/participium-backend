import { minioClient, MINIO_BUCKET } from "./minioClient";

export const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET).catch(() => false);

    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, "us-east-1");
      console.log(`Created MinIO bucket: ${MINIO_BUCKET}`);
    } else {
      console.log(`MinIO bucket already exists: ${MINIO_BUCKET}`);
    }

    // Simple connection test
    const buckets = await minioClient.listBuckets();
    console.log("Buckets::", buckets.map(b => b.name));
  } catch (err) {
    console.error("MinIO initialization failed:", err);
  }
};
