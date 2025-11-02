import  request  from "supertest"
import  app  from "../src/app";

beforeAll(async () => {
  // await connectToDatabase();
});

afterAll(async () => {
  // await disconnectDatabase();
});

export const api = request(app);

