import { CompanyMapper } from "../../../src/mappers/CompanyMapper";
import { ExternalMaintainerMapper as _ExternalMaintainerMapper } from "../../../src/mappers/InternalUserMapper";

// Mock InternalUserMapper to isolate tests
jest.mock("../../../src/mappers/InternalUserMapper", () => ({
  ExternalMaintainerMapper: {
    toDTO: jest.fn((user) => ({ id: user.id, name: user.firstName })),
  },
}));

describe("CompanyMapper", () => {
  const mockCompany = {
    id: 1,
    email: "company@test.com",
    name: "FixIt Inc",
    description: "Fixes things",
    categories: [
      { category: { id: 10, name: "Plumbing" } },
      { category: { id: 11, name: "Electrical" } },
    ],
    internalUsers: [
      { id: 100, firstName: "Bob" },
      { id: 101, firstName: "Alice" },
    ],
  } as any;

  it("toDTO should map basic fields", () => {
    const dto = CompanyMapper.toDTO(mockCompany);
    expect(dto).toEqual({
      id: 1,
      contactEmail: "company@test.com",
      name: "FixIt Inc",
      description: "Fixes things",
    });
  });

  it("toDTOwithCategories should map categories", () => {
    const dto = CompanyMapper.toDTOwithCategories(mockCompany);
    expect(dto.categories).toHaveLength(2);
    expect(dto.categories).toEqual([
      { id: 10, name: "Plumbing" },
      { id: 11, name: "Electrical" },
    ]);
  });

  it("toDTOwithCategories should handle missing categories", () => {
    const companyNoCats = { ...mockCompany, categories: undefined };
    const dto = CompanyMapper.toDTOwithCategories(companyNoCats);
    expect(dto.categories).toEqual([]);
  });

  it("toDTOwithEmployees should handle missing employees", () => {
    const companyNoEmps = { ...mockCompany, internalUsers: undefined };
    const dto = CompanyMapper.toDTOwithEmployees(companyNoEmps);
    expect(dto.employees).toEqual([]);
  });
});