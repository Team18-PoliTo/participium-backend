import {minioClient, MINIO_BUCKET, PROFILE_BUCKET, MINIO_EXTERNAL_ENDPOINT, MINIO_EXTERNAL_PORT, MINIO_EXTERNAL_USE_SSL} from "../config/minioClient";

class MinioService {
  async uploadFile(
    objectKey: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    await minioClient.putObject(
      MINIO_BUCKET,
      objectKey,
      fileBuffer,
      fileBuffer.length,
      { "Content-Type": mimeType }
    );
    return objectKey;
  }

  async getFile(objectKey: string): Promise<Buffer> {
    const stream = await minioClient.getObject(MINIO_BUCKET, objectKey);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  async deleteFile(objectKey: string): Promise<void> {
    await minioClient.removeObject(MINIO_BUCKET, objectKey);
  }

  /**
   * Copy a file from one location to another within the same bucket
   * @param sourcePath - Source object key
   * @param destPath - Destination object key
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    // Read file from source
    const sourceBuffer = await this.getFile(sourcePath);

    // Get metadata from source file to preserve content type
    let contentType = "application/octet-stream";
    try {
      const stat = await minioClient.statObject(MINIO_BUCKET, sourcePath);
      contentType =
        stat.metaData?.["content-type"] ||
        stat.metaData?.["Content-Type"] ||
        "application/octet-stream";
    } catch (error) {
      // If stat fails, use default content type
      console.warn(
        `Could not get metadata for ${sourcePath}, using default content type`
      );
    }

    // Write file to destination
    await minioClient.putObject(
      MINIO_BUCKET,
      destPath,
      sourceBuffer,
      sourceBuffer.length,
      { "Content-Type": contentType }
    );
  }

  /**
   * Check if a file exists in MinIO
   * @param objectKey - The MinIO object key
   * @returns True if file exists, false otherwise
   */
  async fileExists(objectKey: string): Promise<boolean> {
    try {
      await minioClient.statObject(MINIO_BUCKET, objectKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async uploadUserProfilePhoto(userId: number, file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new Error("No file provided");
    }
    const extension = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = file.mimetype || "application/octet-stream";
    const objectKey = `citizens/${userId}/profile.${extension}`;
    const PROFILE_BUCKET = process.env.MINIO_PROFILE_BUCKET || "profile-photos";
    const exists = await minioClient.bucketExists(PROFILE_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(PROFILE_BUCKET);
    }
    await minioClient.putObject(
        PROFILE_BUCKET,
        objectKey,
        file.buffer,
        file.buffer.length,
        { "Content-Type": mimeType }
    );

    return objectKey;
  }

  /**
   * Generate a pre-signed URL for accessing a file
   * Uses internal client to generate URL (can connect to MinIO), then replaces hostname
   * with external endpoint so URLs work from outside Docker network
   * @param objectKey - The MinIO object key
   * @param expirySeconds - URL expiry time in seconds (default: 7 days)
   * @returns Pre-signed URL with external endpoint
   */
  async getPresignedUrl(
    objectKey: string,
    expirySeconds: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    try {
      // Generate presigned URL using internal client (can connect to MinIO)
      const presignedUrl = await minioClient.presignedGetObject(
        MINIO_BUCKET,
        objectKey,
        expirySeconds
      );

      // Replace the internal endpoint with external endpoint in the URL
      // This ensures the URL works from outside the Docker network
      const protocol = MINIO_EXTERNAL_USE_SSL ? "https" : "http";
      const internalEndpoint = `${process.env.MINIO_ENDPOINT || "localhost"}:${parseInt(process.env.MINIO_PORT || "9000")}`;
      const externalEndpoint = `${MINIO_EXTERNAL_ENDPOINT}:${MINIO_EXTERNAL_PORT}`;
      
      // Replace internal endpoint with external endpoint in the URL
      // Handle both http://minio:9000 and https://minio:9000 formats
      const url = new URL(presignedUrl);
      url.hostname = MINIO_EXTERNAL_ENDPOINT;
      url.port = MINIO_EXTERNAL_PORT.toString();
      url.protocol = protocol + ":";
      
      return url.toString();
    } catch (error: any) {
      console.warn(
        `[MinIO] Could not generate presigned URL for ${objectKey}:`,
        error && error.message ? error.message : error
      );
      // return empty string as fallback so callers can filter falsy values
      return "";
    }
  }
}

export default new MinioService();
