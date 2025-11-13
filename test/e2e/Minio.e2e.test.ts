import { minioClient, MINIO_BUCKET } from "../../src/config/minioClient";

describe("MinIO configuration", () => {
  it("should expose a configured client instance", () => {
    expect(minioClient).toBeDefined();
    expect(typeof MINIO_BUCKET).toBe("string");
    expect(MINIO_BUCKET.length).toBeGreaterThan(0);
  });
});
