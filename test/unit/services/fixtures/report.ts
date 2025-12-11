// test/fixtures/report.ts
import { ReportStatus } from "../../../../src/constants/ReportStatus";

export const mockCitizen = { id: 10 };

export const mockCategory = {
  id: 1,
  name: "Road",
  description: "Road issues",
};

export const mockBaseReport = {
  id: 42,
  citizen: mockCitizen,
  title: "Initial",
  description: "Initial desc",
  category: mockCategory,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  location: JSON.stringify({ latitude: 20, longitude: 10 }),
  photo1: undefined,
  photo2: undefined,
  photo3: undefined,
  status: ReportStatus.PENDING_APPROVAL,
};
