import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { readdirSync } from "fs";
import InternalUserDAO from "../models/dao/InternalUserDAO";
import RoleDAO from "../models/dao/RoleDAO";
import * as bcrypt from "bcrypt";

// this is needed, otherwise TypeORM can't find the entities
const ENTITIES_PATH = path.resolve(__dirname, "../models/dao");

// Dynamically import all entity files
const entities = readdirSync(ENTITIES_PATH)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
  .map((file) => {
    const required = require(path.join(ENTITIES_PATH, file));
    // Assuming each file exports a single entity class as default
    const key = Object.keys(required)[0];
    return required[key];
  });

// Path to migration files
const MIGRATIONS_PATH = path.resolve(__dirname, "../data/migrations/*.{ts,js}");

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.resolve(__dirname, "../data/database.sqlite"),
  entities: entities,
  migrations: [MIGRATIONS_PATH],
  synchronize: true, // use migrations instead
  logging: false,
});

// Initialize the database connection
export async function initializeDatabase() {
  try {
    await AppDataSource.initialize()
      .then(async () => {
        // first add roles
        const rolesRepository = AppDataSource.getRepository(RoleDAO);
        const rolesToAdd = [
          { id: 0, role: "TBD" },
          { id: 1, role: "ADMIN" }, //municipal administrator 
          { id: 2, role: "PRO"}, //public relations officer
          { id: 3, role: "TOS"}, //technical office staff
          { id: 4, role: "ET"}, //enviromental technician 
          {}
          // Other roles can be added here
        ];
        for (const roleData of rolesToAdd) {
          const existingRole = await rolesRepository.findOneBy({
            id: roleData.id,
          });
          if (!existingRole) {
            const role = rolesRepository.create(roleData);
            await rolesRepository.save(role);
            console.log(`Role ${roleData.role} added.`);
          }
        }
        // then add admin
        const internalUserRepository =
          AppDataSource.getRepository(InternalUserDAO);

        const existing = await internalUserRepository.findOneBy({
          email: "admin@admin.com",
        });
        if (!existing) {
          const role = await rolesRepository.findOneBy({ id: 1 });
          if (!role) throw new Error("Admin role not found.");

          const admin = internalUserRepository.create({
            firstName: "AdminFirstName",
            lastName: "AdminLastName",
            email: "admin@admin.com",
            password: await bcrypt.hash("admin", 10),
            role: role,
          });
          await internalUserRepository.save(admin);
          console.log("Admin configured");
        }
      })
      .catch((error) => console.error(error));
    console.log("Database connection established.");
    // With synchronize: true, tables are auto-created from entities
    /*
    ----- commented because i can seed from here ------------
    // Migrations are usadminRoled for seed data only
    await AppDataSource.runMigrations();
    console.log("Seed data migrations have been run.");
    */
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
