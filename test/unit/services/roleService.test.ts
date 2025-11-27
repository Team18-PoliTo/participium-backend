import RoleService from "../../../src/services/RoleService";
import RoleRepository from "../../../src/repositories/implementation/RoleRepository";
import RoleDAO from "../../../src/models/dao/RoleDAO";

describe("RoleService", () => {
  let roleService: RoleService;
  let mockRoleRepo: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    mockRoleRepo = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<RoleRepository>;
    
    roleService = new RoleService(mockRoleRepo);
  });

  it("getAllRoles should return roles from repository", async () => {
    const roles = [
        { id: 1, role: "ADMIN" }, 
        { id: 2, role: "USER" }
    ] as RoleDAO[];
    
    mockRoleRepo.findAll.mockResolvedValue(roles);

    const result = await roleService.getAllRoles();

    expect(mockRoleRepo.findAll).toHaveBeenCalled();
    expect(result).toEqual(roles);
  });
});