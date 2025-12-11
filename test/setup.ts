import request from "supertest";

jest.mock("../src/config/initMinio", () => ({
  initMinio: jest.fn().mockResolvedValue(undefined),
}));

import app from "../src/app";

export const api = request(app);
