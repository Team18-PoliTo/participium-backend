import dotenv from 'dotenv';
import app from './src/app';
import { initializeDatabase } from "./src/config/database";


dotenv.config();
initializeDatabase().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

