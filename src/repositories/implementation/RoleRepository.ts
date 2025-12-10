import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import RoleDAO from "../../models/dao/RoleDAO";

interface IRoleRepository {
  create(role: RoleDAO): Promise<RoleDAO>;
  findById(id: number): Promise<RoleDAO | null>;
  findAll(): Promise<RoleDAO[]>;
}

export class RoleRepository implements IRoleRepository {
  constructor(
    private readonly repo: Repository<RoleDAO> = AppDataSource.getRepository(
      RoleDAO
    )
  ) {}

  async create(role: RoleDAO): Promise<RoleDAO> {
    const newRole = this.repo.create(role);
    return await this.repo.save(newRole);
  }

  async findById(id: number): Promise<RoleDAO | null> {
    return await this.repo.findOneBy({ id });
  }

  async findAll(): Promise<RoleDAO[]> {
    return await this.repo.find();
  }
}

export default RoleRepository;
