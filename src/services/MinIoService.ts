import {
  minioClient,
  minioClientForPresigned,
  MINIO_BUCKET,
} from "../config/minioClient";

class MinIoService {
  async uploadFile(
    bucket: string,
    objectKey: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    await minioClient.putObject(
      bucket,
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

  async deleteFile(bucket: string, objectKey: string): Promise<void> {
    await minioClient.removeObject(bucket, objectKey);
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
      console.warn(
        `Could not get metadata for ${sourcePath}, using default content type`,
        error
      );
      throw new Error(
        `Failed to fetch metadata for ${sourcePath}: ${String(error)}`
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
      console.warn(`[MinIO] File does not exist: ${objectKey}`, error);
      return false;
    }
  }

  async uploadUserProfilePhoto(
    userId: number,
    file: Express.Multer.File
  ): Promise<string> {
    if (!file) {
      throw new Error("No file provided");
    }
    const extension =
      file.originalname.split(".").pop()?.toLowerCase() || "jpg";
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
   * Uses external client configured with external endpoint to generate URL
   * The signature is calculated with the external endpoint, so it's valid for external access
   * Note: presigned URL generation doesn't require a network connection - it's just cryptographic signing
   * @param objectKey - The MinIO object key
   * @param bucket - The bucket name (defaults to MINIO_BUCKET for backward compatibility)
   * @param expirySeconds - URL expiry time in seconds (default: 7 days)
   * @returns Pre-signed URL with external endpoint
   */
  async getPresignedUrl(
    objectKey: string,
    bucket: string = MINIO_BUCKET,
    expirySeconds: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    try {
      // Generate presigned URL using external client
      // This ensures the signature is calculated with the external endpoint (merguven.ddns.net:9000)
      // The signature includes the hostname, so it must match the URL that will be accessed
      // The region is set in the client config to avoid getBucketRegionAsync call
      // Note: presigned URL generation is primarily cryptographic, but MinIO client may validate connection
      return await minioClientForPresigned.presignedGetObject(
        bucket,
        objectKey,
        expirySeconds
      );
    } catch (error: any) {
      // If we get a connection error, it means external endpoint is not reachable from Docker
      // In that case, we might need to make it reachable or use a different approach
      console.warn(
        `[MinIO] Could not generate presigned URL for ${objectKey} in bucket ${bucket}:`,
        error?.message ?? error
      );
      // return empty string as fallback so callers can filter falsy values
      return "";
    }
  }
}

export default new MinIoService();
