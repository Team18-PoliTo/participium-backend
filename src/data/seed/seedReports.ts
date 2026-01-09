import * as fs from "node:fs";
import * as path from "node:path";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import ReportDAO from "../../models/dao/ReportDAO";
import CitizenDAO from "../../models/dao/CitizenDAO";
import CategoryDAO from "../../models/dao/CategoryDAO";
import InternalUserDAO from "../../models/dao/InternalUserDAO";
import DelegatedReportDAO from "../../models/dao/DelegatedReportDAO";
import CommentDAO from "../../models/dao/CommentDAO";
import MinIoService from "../../services/MinIoService";
import { MINIO_BUCKET } from "../../config/minioClient";
import { SeedReport } from "./seedReport";

/**
 * Seeds the database with sample reports and uploads images to MinIO.
 * This function should be called after MinIO is initialized and the database is ready.
 *
 * @param dataSource - The TypeORM DataSource instance
 * @param forceSeed - If true, will seed even if reports already exist
 */
export async function seedReports(
  dataSource: DataSource,
  forceSeed: boolean = false
): Promise<void> {
  const reportRepo = dataSource.getRepository(ReportDAO);

  // Check if reports already exist
  const existingCount = await reportRepo.count();
  if (existingCount > 0 && !forceSeed) {
    console.log(
      `[Seed] Reports already exist (${existingCount}). Skipping report seeding.`
    );
    return;
  }

  // If force seeding, delete existing reports first
  if (forceSeed && existingCount > 0) {
    console.log(
      `[Seed] Force seed enabled. Deleting ${existingCount} existing reports...`
    );
    // IMPORTANT: clear child tables first to satisfy FK constraints (SQLite enforces these)
    // delegated_reports -> reports (can block deletion)
    // comments -> reports (should cascade, but clearing explicitly is safer across DBs)
    const delegatedReportRepo = dataSource.getRepository(DelegatedReportDAO);
    const commentRepo = dataSource.getRepository(CommentDAO);

    await delegatedReportRepo.clear();
    await commentRepo.clear();
    await reportRepo.clear();
  }

  // Load seed data
  let seedDataPath = path.join(__dirname, "seed-reports.json");

  // Handle both src and dist paths
  if (!fs.existsSync(seedDataPath) && __dirname.includes("/dist/")) {
    seedDataPath = path.join(
      __dirname,
      "../../../../src/data/seed/seed-reports.json"
    );
  }

  if (!fs.existsSync(seedDataPath)) {
    console.error(`[Seed] Seed data file not found at: ${seedDataPath}`);
    return;
  }

  const seedData: SeedReport[] = JSON.parse(
    fs.readFileSync(seedDataPath, "utf-8")
  );
  console.log(`[Seed] Loaded ${seedData.length} reports from seed data.`);

  // Get citizen 1 (default test citizen)
  const citizenRepo = dataSource.getRepository(CitizenDAO);
  const citizen = await citizenRepo.findOne({ where: { id: 1 } });
  if (!citizen) {
    console.error(
      "[Seed] Citizen with ID 1 not found. Skipping report seeding."
    );
    return;
  }

  // Get category and internal user repos
  const categoryRepo = dataSource.getRepository(CategoryDAO);
  const internalUserRepo = dataSource.getRepository(InternalUserDAO);

  // Determine images directory (handle both src and dist)
  let imagesDir = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDir) && __dirname.includes("/dist/")) {
    imagesDir = path.join(__dirname, "../../../../src/data/seed/images");
  }

  if (!fs.existsSync(imagesDir)) {
    console.error(`[Seed] Images directory not found at: ${imagesDir}`);
    return;
  }

  console.log("[Seed] Looking for images in:", imagesDir);

  let successCount = 0;

  for (let idx = 0; idx < seedData.length; idx++) {
    const seedReport = seedData[idx];
    const folderIndex = idx + 1;

    try {
      // Get category
      const category = await categoryRepo.findOne({
        where: { id: seedReport.categoryId },
      });
      if (!category) {
        console.warn(
          `[Seed] Category ${seedReport.categoryId} not found. Skipping report: ${seedReport.title}`
        );
        continue;
      }

      // Get assigned user if specified
      let assignedTo: InternalUserDAO | null = null;
      if (seedReport.assignedToId) {
        assignedTo = await internalUserRepo.findOne({
          where: { id: seedReport.assignedToId },
        });
        if (!assignedTo) {
          console.warn(
            `[Seed] Assigned user ${seedReport.assignedToId} not found. Setting to null.`
          );
        }
      }

      // Create report first to get ID (createdAt will be staggered to show different dates)
      const daysAgo = seedData.length - idx; // Older reports first
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const report = reportRepo.create({
        citizen,
        isAnonymous: seedReport.isAnonymous,
        title: seedReport.title,
        description: seedReport.description,
        category,
        location: JSON.stringify(seedReport.location),
        address: seedReport.address,
        status: seedReport.status,
        explanation: seedReport.explanation,
        assignedTo,
        createdAt,
      });

      const savedReport = await reportRepo.save(report);

      // Upload images
      const imageFolder = path.join(imagesDir, String(folderIndex));

      if (!fs.existsSync(imageFolder)) {
        console.warn(`[Seed] Image folder not found: ${imageFolder}`);
        successCount++;
        continue;
      }

      const uploadedPaths: string[] = [];

      for (
        let imgIdx = 0;
        imgIdx < seedReport.images.length && imgIdx < 3;
        imgIdx++
      ) {
        const imageName = seedReport.images[imgIdx];
        const imagePath = path.join(imageFolder, imageName);

        if (!fs.existsSync(imagePath)) {
          console.warn(`[Seed] Image not found: ${imagePath}`);
          continue;
        }

        try {
          const imageBuffer = fs.readFileSync(imagePath);
          const ext = path.extname(imageName).toLowerCase();
          const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

          // Generate MinIO path matching the app's pattern
          const minioPath = `reports/${savedReport.id}/photo${imgIdx + 1}_${uuidv4()}${ext}`;

          // Upload to MinIO
          await MinIoService.uploadFile(
            MINIO_BUCKET,
            minioPath,
            imageBuffer,
            mimeType
          );
          uploadedPaths.push(minioPath);

          console.log(`[Seed] Uploaded: ${imageName} -> ${minioPath}`);
        } catch (uploadError) {
          console.error(`[Seed] Failed to upload ${imageName}:`, uploadError);
        }
      }

      // Update report with photo paths
      if (uploadedPaths[0]) savedReport.photo1 = uploadedPaths[0];
      if (uploadedPaths[1]) savedReport.photo2 = uploadedPaths[1];
      if (uploadedPaths[2]) savedReport.photo3 = uploadedPaths[2];

      await reportRepo.save(savedReport);
      console.log(
        `[Seed] Created report ${savedReport.id}: ${savedReport.title} (${uploadedPaths.length} images)`
      );
      successCount++;
    } catch (error) {
      console.error(
        `[Seed] Failed to create report "${seedReport.title}":`,
        error
      );
    }
  }

  console.log(
    `[Seed] Successfully created ${successCount}/${seedData.length} reports with images.`
  );
}

export default seedReports;
