import fs from "fs";
import path from "path";
import {
    AppDataSource,
    initializeDatabase,
    closeDatabase,
} from "../../src/config/database";
import InternalUserDAO from "../../src/models/dao/InternalUserDAO";
import RoleDAO from "../../src/models/dao/RoleDAO";
import * as bcrypt from "bcrypt";

const DB_PATH = path.resolve(
    __dirname,
    "../../src/data/database.sqlite"
);

describe("Database E2E Tests", () => {
    beforeAll(async () => {
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }

        await initializeDatabase();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    it("should initialize database connection successfully", async () => {
        expect(AppDataSource.isInitialized).toBe(true);
    });

    it("should have created default roles", async () => {
        const roleRepo = AppDataSource.getRepository(RoleDAO);
        const roles = await roleRepo.find();

        expect(roles.length).toBeGreaterThanOrEqual(10);
        expect(roles.map((r) => r.role)).toEqual(
            expect.arrayContaining([
                "Unassigned",
                "ADMIN",
                "Public Relations Officer",
                "Street Maintenance Operator",
                "Public Lighting Operator",
                "Waste Management Operator",
                "Urban Mobility Operator",
                "Green Spaces Operator",
                "Water Infrastructure Operator",
                "Accessibility Officer",
            ])
        );
    });

    it("should have created default admin user", async () => {
        const userRepo = AppDataSource.getRepository(InternalUserDAO);
        const admin = await userRepo.findOne({
            where: { email: "admin@participium.com" },
            relations: ["role"],
        });

        expect(admin).toBeDefined();
        expect(admin!.role.role).toBe("ADMIN");
        expect(admin!.status).toBe("ACTIVE");

        const isValid = await bcrypt.compare("password123", admin!.password);
        expect(isValid).toBe(true);
    });

    it("should not create duplicate admin user on re-initialization", async () => {
        const userRepo = AppDataSource.getRepository(InternalUserDAO);
        const before = await userRepo.count();

        await closeDatabase();
        await initializeDatabase();

        const after = await userRepo.count();
        expect(after).toBe(before); // новых админов не появилось
    });

    it("should close database connection successfully", async () => {
        expect(AppDataSource.isInitialized).toBe(true);

        await closeDatabase();
        expect(AppDataSource.isInitialized).toBe(false);

        await initializeDatabase();
        expect(AppDataSource.isInitialized).toBe(true);
    });
});
