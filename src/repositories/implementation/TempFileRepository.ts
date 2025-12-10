import { Repository, LessThan } from "typeorm";
import { AppDataSource } from "../../config/database";
import TempFileDAO from "../../models/dao/TempFileDAO";
import { ITempFileRepository } from "../ITempFileRepository";

export class TempFileRepository implements ITempFileRepository {
  private readonly repo: Repository<TempFileDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(TempFileDAO);
  }

  async create(tempFile: Partial<TempFileDAO>): Promise<TempFileDAO> {
    const file = this.repo.create(tempFile);
    return await this.repo.save(file);
  }

  async findByFileId(fileId: string): Promise<TempFileDAO | null> {
    return await this.repo.findOne({
      where: { fileId },
    });
  }

  async findExpired(): Promise<TempFileDAO[]> {
    return await this.repo.find({
      where: {
        expiresAt: LessThan(new Date()),
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}

export default TempFileRepository;
