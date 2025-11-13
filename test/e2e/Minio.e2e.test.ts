// test/e2e/Minio.e2e.test.ts
import { Readable } from 'stream';
import { minioClient, MINIO_BUCKET } from '../../src/config/minioClient';
import { initMinio } from '../../src/config/initMinio';

jest.setTimeout(30000);

function streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        stream.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf-8'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

describe('MinIO E2E Tests', () => {
    beforeAll(async () => {
        await initMinio();
    });

    it('→ bucket should exist after initMinio()', async () => {
        const exists = await minioClient.bucketExists(MINIO_BUCKET);
        expect(exists).toBe(true);
    });

    it('→ initMinio() can be called twice without errors (idempotent)', async () => {
        await expect(initMinio()).resolves.not.toThrow();

        const exists = await minioClient.bucketExists(MINIO_BUCKET);
        expect(exists).toBe(true);
    });

    it('→ MINIO_BUCKET is present in listBuckets()', async () => {
        const buckets = await minioClient.listBuckets();
        const names = buckets.map((b: any) => b.name);
        expect(names).toContain(MINIO_BUCKET);
    });

    it('→ can upload, download and delete an object', async () => {
        const objectName = `e2e-test-object-${Date.now()}.txt`;
        const content = 'Hello from MinIO E2E test 👋';

        await minioClient.putObject(
            MINIO_BUCKET,
            objectName,
            Buffer.from(content, 'utf-8')
        );

        const stream = await minioClient.getObject(MINIO_BUCKET, objectName);
        const downloaded = await streamToString(stream as Readable);

        expect(downloaded).toBe(content);

        await minioClient.removeObject(MINIO_BUCKET, objectName);
    });
});