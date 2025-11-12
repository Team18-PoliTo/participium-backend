import { minioClient, MINIO_BUCKET } from "../config/minioClient";
import { Readable } from "stream";

class MinioService {
  async uploadFile(objectKey: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
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
}

export default new MinioService();
