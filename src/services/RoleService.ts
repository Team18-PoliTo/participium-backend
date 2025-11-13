import RoleRepository from "../repositories/RoleRepository";
import RoleDAO from "../models/dao/RoleDAO";

class RoleService {
  constructor(private roleRepository: RoleRepository) {}

  async getAllRoles(): Promise<RoleDAO[]> {
    return this.roleRepository.findAll();
  }
}

export default RoleService;
