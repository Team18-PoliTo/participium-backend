import { Client } from "minio";

// Internal client for operations (uses Docker service name for internal network)
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

// External client for presigned URLs (uses public/external endpoint)
// This ensures presigned URLs are accessible from outside the Docker network
// If MINIO_EXTERNAL_ENDPOINT is not set, fall back to internal endpoint (for local dev)
const externalEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT || "localhost";
const externalPort = parseInt(process.env.MINIO_EXTERNAL_PORT || process.env.MINIO_PORT || "9000");
const externalUseSSL = process.env.MINIO_EXTERNAL_USE_SSL === "true" || (process.env.MINIO_EXTERNAL_USE_SSL === undefined && process.env.MINIO_USE_SSL === "true");

export const minioClientForPresigned = new Client({
  endPoint: externalEndpoint,
  port: externalPort,
  useSSL: externalUseSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "reports";
export const PROFILE_BUCKET = process.env.MINIO_PROFILE_BUCKET || "profile-photos";

