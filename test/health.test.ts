import app from "../src/app";
import request from "supertest";

describe("Health Check Endpoint", () => {
  it("GET /api/health should return status ok", async () => {
    const res = await request(app).get("/api/health");

    console.log(res.status, res.body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      message: "Participium API is running",
    });
  });
});
