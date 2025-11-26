import { Client } from "minio";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "unit-test-bucket";

describe("MinIO E2E Tests", () => {
    let minioClient: Client;

    const initMinio = async () => {
        const buckets = await minioClient.listBuckets();
        const exists = buckets.some(b => b.name === MINIO_BUCKET);

        if (!exists) await minioClient.makeBucket(MINIO_BUCKET);
    };

    beforeAll(async () => {
        minioClient = new Client({
            endPoint: process.env.MINIO_ENDPOINT || "localhost",
            port: Number(process.env.MINIO_PORT) || 9000,
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
            secretKey: process.env.MINIO_SECRET_KEY || "minioadmin"
        });

        await initMinio();
    });

    it("→ bucket should exist after init", async () => {
        const buckets = await minioClient.listBuckets();
        expect(buckets.some(b => b.name === MINIO_BUCKET)).toBe(true);
    });

    it("→ init logic is idempotent", async () => {
        await expect(initMinio()).resolves.not.toThrow();
    });

    it("→ MINIO_BUCKET is present in listBuckets()", async () => {
        const buckets = await minioClient.listBuckets();
        const names = buckets.map(b => b.name);
        expect(names).toContain(MINIO_BUCKET);
    });

    it("→ can upload, download and delete an object", async () => {
        const objectName = `e2e-test-object-${Date.now()}.txt`;
        const content = "Hello from MinIO E2E test!";
        const buffer = Buffer.from(content, "utf-8");

        await minioClient.putObject(MINIO_BUCKET, objectName, buffer);

        const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
        let downloaded = "";
        for await (const chunk of stream) {
            downloaded += chunk.toString();
        }

        expect(downloaded).toBe(content);
        await minioClient.removeObject(MINIO_BUCKET, objectName);

        await expect(minioClient.getObject(MINIO_BUCKET, objectName)).rejects.toThrow();
    });
});
