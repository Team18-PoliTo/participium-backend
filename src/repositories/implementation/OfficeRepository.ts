// src/repositories/implementation/OfficeRepository.ts
import { Repository } from "typeorm";
import OfficeDAO from "../../models/dao/OfficeDAO";

export class OfficeRepository {
  private repo: Repository<OfficeDAO>;

  constructor(repo: Repository<OfficeDAO>) {
    this.repo = repo;
  }

  async findAll() {
    return this.repo.find({ relations: ["roles"] });
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id }, relations: ["roles"] });
  }

  async findByName(name: string) {
    return this.repo.findOne({ where: { name }, relations: ["roles"] });
  }

  async create(payload: Partial<OfficeDAO>) {
    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }
}
