import "reflect-metadata";
import dotenv from "dotenv";
import app from "./src/app";
import { initializeDatabase } from "./src/config/database";
import { initMinio } from "./src/config/initMinio";

dotenv.config();

// Initialize in proper order: Database -> MinIO -> Seed Reports
async function bootstrap() {
  try {
    // 1. Initialize database and run migrations
    await initializeDatabase();

    // 2. Initialize MinIO and seed reports (seeding happens inside initMinio)
    await initMinio();

    // 3. Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
