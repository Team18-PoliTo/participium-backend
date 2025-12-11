// test/e2e/roleRoutes.e2e.test.ts
import request from "supertest";
import express, { Express } from "express";
import roleRouter from "../../src/routes/roleRoutes";
import { AppDataSource } from "../../src/config/database";
import RoleDAO from "../../src/models/dao/RoleDAO";

let app: Express;

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  // Чистая схема на каждый прогон e2e
  await AppDataSource.synchronize(true);

  app = express();
  app.use(express.json());
  app.use("/admin/roles", roleRouter);
});

beforeEach(async () => {
  const repo = AppDataSource.getRepository(RoleDAO);
  await repo.clear();
  const roles = repo.create([
    // Если у вас поле называется name — замените role: на name:
    { role: "ADMIN" as any },
    { role: "OPERATOR" as any },
    { role: "VIEWER" as any },
  ]);
  await repo.save(roles);
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

describe("GET /admin/roles (E2E, real DB)", () => {
  test("→ returns 200 and list of roles", async () => {
    const res = await request(app).get("/admin/roles").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);

    for (const r of res.body) {
      expect(r).toHaveProperty("id");
      expect(typeof r.role === "string" || typeof r.name === "string").toBe(
        true
      );
    }

    const names = res.body.map((r: any) => r.role ?? r.name);
    expect(names).toEqual(
      expect.arrayContaining(["ADMIN", "OPERATOR", "VIEWER"])
    );
  });

  test("→ returns empty list when no roles", async () => {
    const repo = AppDataSource.getRepository(RoleDAO);
    await repo.clear();

    const res = await request(app).get("/admin/roles").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });
});
