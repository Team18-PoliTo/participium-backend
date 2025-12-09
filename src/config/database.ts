import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { readdirSync } from "fs";

// this is needed, otherwise TypeORM can't find the entities
const ENTITIES_PATH = path.resolve(__dirname, "../models/dao");

// Dynamically import all entity files
const entities = readdirSync(ENTITIES_PATH)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
  .map((file) => {
    const required = require(path.join(ENTITIES_PATH, file));
    // Handle both default exports and named exports
    return required.default || required[Object.keys(required)[0]];
  })
  .filter((entity) => entity !== undefined);

// Path to migration files
const MIGRATIONS_PATH = path.resolve(__dirname, "../data/migrations/*.{ts,js}");

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.resolve(__dirname, "../data/database.sqlite"),
  entities: entities,
  migrations: [MIGRATIONS_PATH],
  synchronize: true,
  logging: false,
});

// Initialize the database connection
export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log("Database connection established.");
    
    // Create all entity tables first
    await AppDataSource.synchronize();
    console.log("Database schema synchronized.");
    
    // Then run migrations for seed data
    await AppDataSource.runMigrations();
    console.log("Seed data migrations have been run.");
  } catch (error) {
    console.error("Error while opening the database: ", error);
    process.exit(1);
  }
}

// Close the database connection
export async function closeDatabase() {
  try {
    await AppDataSource.destroy();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error while closing the database: ", error);
  }
}
