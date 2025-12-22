import "reflect-metadata";
import dotenv from "dotenv";
import app from "./src/app";
import { initializeDatabase } from "./src/config/database";
import { initMinio } from "./src/config/initMinio";
import { createServer } from "http";
import { initInternalSocket } from "./src/ws/internalSocket";

dotenv.config();

// Initialize in proper order: Database -> MinIO -> Seed Reports
async function bootstrap() {
  try {
    // 1. Initialize database and run migrations
    await initializeDatabase();

    // 2. Initialize MinIO and seed reports (seeding happens inside initMinio)
    await initMinio();

    // 3. Start the server
    const port = process.env.PORT || 3001;
    const server = createServer(app);

    // Initialize WebSocket namespace for internal users
    initInternalSocket(server);

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

(async () => {
  try {
    await bootstrap();
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
