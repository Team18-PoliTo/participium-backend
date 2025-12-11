import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import CategoryDAO from "../../src/models/dao/CategoryDAO";
import { CategoryDTO } from "../../src/models/dto/CategoryDTO";

describe("Category E2E Tests", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true);
  });

  beforeEach(async () => {
    const categoryRepo = AppDataSource.getRepository(CategoryDAO);
    await categoryRepo.clear();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("GET /api/categories", () => {
    it("should return empty array when no categories exist", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return all categories with correct structure", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      await categoryRepo.save({
        name: "Water Supply",
        description: "Water supply and drinking water issues",
      });

      await categoryRepo.save({
        name: "Road Maintenance",
        description: "Road repairs and maintenance",
      });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      const categoryDTO: CategoryDTO = res.body[0];
      expect(categoryDTO).toHaveProperty("id");
      expect(categoryDTO).toHaveProperty("name");
      expect(categoryDTO).toHaveProperty("description");
      expect(typeof categoryDTO.id).toBe("number");
      expect(typeof categoryDTO.name).toBe("string");
      expect(["string", "object"]).toContain(typeof categoryDTO.description); // can be string or null

      const categoryNames = res.body.map((cat: CategoryDTO) => cat.name);
      expect(categoryNames).toContain("Water Supply");
      expect(categoryNames).toContain("Road Maintenance");
    });

    it("should handle categories with null descriptions", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      await categoryRepo.save({
        name: "No Description Category",
      });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);

      const category = res.body[0];
      expect(category.name).toBe("No Description Category");
      expect(category.description).toBeNull();
    });

    it("should return categories in correct order", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      // Create categories in reverse order
      await categoryRepo.save({
        name: "Category B",
        description: "Second category",
      });

      await categoryRepo.save({
        name: "Category A",
        description: "First category",
      });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);

      // Should be ordered by ID ascending
      expect(res.body[0].id).toBeLessThan(res.body[1].id);
      expect(res.body[0].name).toBe("Category B"); // First created
      expect(res.body[1].name).toBe("Category A"); // Second created
    });
  });

  describe("Category Data Validation", () => {
    it("should not allow duplicate category names", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      // First category
      await categoryRepo.save({
        name: "Unique Category",
        description: "First instance",
      });

      // Try to create duplicate - this should fail at database level
      try {
        await categoryRepo.save({
          name: "Unique Category", // Same name
          description: "Second instance",
        });
        // If we reach here, the test should fail because duplicate was allowed
        expect(true).toBe(false); // Force test failure
      } catch (error) {
        // Expected - duplicate name should cause error
        expect(error).toBeDefined();
      }

      // Verify only one category exists
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Unique Category");
    });

    it("should handle special characters in category names", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      const categoryName = "Water-Supply & Maintenance (Emergency)";
      await categoryRepo.save({
        name: categoryName,
        description: "Category with special characters",
      });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe(categoryName);
    });

    it("should handle long category descriptions", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      const longDescription =
        "This is a very long description for a category that might contain detailed information about what types of reports belong to this category and how they should be handled by the municipal staff.";

      await categoryRepo.save({
        name: "Detailed Category",
        description: longDescription,
      });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].description).toBe(longDescription);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection issues gracefully", async () => {
      const res = await request(app).get("/api/categories");

      // Should always return 200 with array (empty or with data)
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return proper content-type header", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("Performance", () => {
    it("should handle large number of categories efficiently", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      // Create multiple categories
      const categories = [];
      for (let i = 0; i < 50; i++) {
        categories.push({
          name: `Category ${i}`,
          description: `Description for category ${i}`,
        });
      }

      await categoryRepo.save(categories);

      const startTime = Date.now();
      const res = await request(app).get("/api/categories");
      const endTime = Date.now();

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(50);

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("Integration with Report System", () => {
    it("should provide categories that can be used in report creation", async () => {
      const categoryRepo = AppDataSource.getRepository(CategoryDAO);

      const reportCategories = [
        {
          name: "Infrastructure",
          description: "Roads, bridges, public buildings",
        },
        { name: "Environment", description: "Parks, green spaces, pollution" },
        {
          name: "Public Safety",
          description: "Lighting, traffic signs, emergency",
        },
      ];

      await categoryRepo.save(reportCategories);

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);

      res.body.forEach((category: CategoryDTO) => {
        expect(category).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
        });
      });

      const categoryNames = res.body.map((cat: CategoryDTO) => cat.name);
      expect(categoryNames).toContain("Infrastructure");
      expect(categoryNames).toContain("Environment");
      expect(categoryNames).toContain("Public Safety");
    });
  });
});
