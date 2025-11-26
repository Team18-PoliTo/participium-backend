import { Client } from "minio";

// Internal client for operations (uses Docker service name for internal network)
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

// External endpoint configuration for presigned URLs
// These are used to replace the hostname in presigned URLs after generation
export const MINIO_EXTERNAL_ENDPOINT = process.env.MINIO_EXTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT || "localhost";
export const MINIO_EXTERNAL_PORT = parseInt(process.env.MINIO_EXTERNAL_PORT || process.env.MINIO_PORT || "9000");
export const MINIO_EXTERNAL_USE_SSL = process.env.MINIO_EXTERNAL_USE_SSL === "true" || (process.env.MINIO_EXTERNAL_USE_SSL === undefined && process.env.MINIO_USE_SSL === "true");

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "reports";
export const PROFILE_BUCKET = process.env.MINIO_PROFILE_BUCKET || "profile-photos";

