import { Client } from "minio";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "reports";

describe("MinIO E2E Tests", () => {
    let minioClient: Client;

    const initMinio = async () => {
        try {
            const buckets = await minioClient.listBuckets();
            const exists = buckets.some(b => b.name === MINIO_BUCKET);

            if (!exists) {
                await minioClient.makeBucket(MINIO_BUCKET);
            }
        } catch (error: any) {
            console.error("MinIO connection error:", error.message);
            throw new Error(`Failed to connect to MinIO at ${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || 9000}. Make sure MinIO is running. Error: ${error.message}`);
        }
    };

    beforeAll(async () => {
        const endpoint = process.env.MINIO_ENDPOINT || "localhost";
        const port = Number(process.env.MINIO_PORT) || 9000;
        const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
        const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

        minioClient = new Client({
            endPoint: endpoint,
            port: port,
            useSSL: process.env.MINIO_USE_SSL === "true",
            accessKey: accessKey,
            secretKey: secretKey
        });

        // Test connection first
        try {
            await minioClient.listBuckets();
        } catch (error: any) {
            throw new Error(`Cannot connect to MinIO at ${endpoint}:${port}. Make sure MinIO is running and accessible. Error: ${error.message}`);
        }

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
