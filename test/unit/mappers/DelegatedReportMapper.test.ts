import DelegatedReportMapper from "../../../src/mappers/DelegatedReportMapper";
import { ReportStatus } from "../../../src/constants/ReportStatus";

describe("DelegatedReportMapper", () => {
  describe("toDTO", () => {
    it("maps DAO to DTO including base report fields", async () => {
      const mockDate = new Date();

      const mockReportDao = {
        id: 1,
        title: "Test Report",
        description: "Desc",
        status: ReportStatus.PENDING_APPROVAL,
        createdAt: mockDate,
        updatedAt: mockDate,
        location: JSON.stringify({ lat: 10, lng: 10 }),
        address: "123 St",
        explanation: "",
        isAnonymous: false,
        photo1: "key1",
        photo2: null,
        photo3: null,
        citizen: {
          id: 5,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        category: {
          id: 2,
          name: "Pothole",
          description: "Road issues",
        },
        assignedTo: null,
      };

      const mockDelegatedDao = {
        delegatedAt: mockDate,
        report: mockReportDao,
      };

      const result = await DelegatedReportMapper.toDTO(mockDelegatedDao as any);

      expect(result.delegatedAt).toBe(mockDate);

      expect(result.id).toBe(1);
      expect(result.title).toBe("Test Report");
      expect(result.category.name).toBe("Pothole");
      expect(result.citizenName).toBe("John");
    });
  });
});
