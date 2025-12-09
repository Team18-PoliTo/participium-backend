import { Client } from "minio";

// Internal client for operations (uses Docker service name for internal network)
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number.parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

// External endpoint configuration for presigned URLs
export const MINIO_EXTERNAL_ENDPOINT =
  process.env.MINIO_EXTERNAL_ENDPOINT ||
  process.env.MINIO_ENDPOINT ||
  "localhost";
export const MINIO_EXTERNAL_PORT = Number.parseInt(
  process.env.MINIO_EXTERNAL_PORT || process.env.MINIO_PORT || "9000"
);
export const MINIO_EXTERNAL_USE_SSL =
  process.env.MINIO_EXTERNAL_USE_SSL === "true" ||
  (process.env.MINIO_EXTERNAL_USE_SSL === undefined &&
    process.env.MINIO_USE_SSL === "true");

// External client for presigned URLs - uses external endpoint for signature calculation
// Set region explicitly to avoid connection attempt during presigned URL generation
export const minioClientForPresigned = new Client({
  endPoint: MINIO_EXTERNAL_ENDPOINT,
  port: MINIO_EXTERNAL_PORT,
  useSSL: MINIO_EXTERNAL_USE_SSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  region: "us-east-1", // Set region explicitly to avoid connection attempt
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "reports";
export const PROFILE_BUCKET =
  process.env.MINIO_PROFILE_BUCKET || "profile-photos";
