import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import OfficeDAO from "../../models/dao/OfficeDAO";

export class OfficeRepository {
  private repo: Repository<OfficeDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(OfficeDAO);
  }

  async findAll(): Promise<OfficeDAO[]> {
    return await this.repo.find({ relations: ["roles"] });
  }

  async findById(id: number): Promise<OfficeDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["roles"],
    });
  }

  async findByName(name: string): Promise<OfficeDAO | null> {
    return await this.repo.findOne({
      where: { name },
      relations: ["roles"],
    });
  }

  async create(officeDAO: Partial<OfficeDAO>): Promise<OfficeDAO> {
    const office = this.repo.create(officeDAO);
    return await this.repo.save(office);
  }
}

