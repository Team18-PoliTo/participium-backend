import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import InternalUserDAO from "../models/dao/InternalUserDAO";
import UserDAO from "../models/dao/UserDAO";

interface IInternalUserRepository {
  create(user: InternalUserDAO): Promise<InternalUserDAO>;
  findByEmail(email: string): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  update(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO []>;
}

export class InternalUserRepository implements IInternalUserRepository {
  constructor(
    private readonly repo: Repository<InternalUserDAO> = AppDataSource.getRepository(
      InternalUserDAO
    )
  ) {}

  async create(user: InternalUserDAO): Promise<InternalUserDAO> {
    const newUser = this.repo.create(user);
    return await this.repo.save(newUser);
  }
  async findByEmail(email: string): Promise<InternalUserDAO | null> {
    return await this.repo.findOne({ where: { email } });
  }
  async findById(id: number): Promise<InternalUserDAO | null> {
    // include role relation so callers receive the role entity populated
    return await this.repo.findOne({ where: { id }, relations: ["role"] });
  }
  async update(user: InternalUserDAO): Promise<InternalUserDAO> {
    return await this.repo.save(user);
  }
  async fetchAll(): Promise<InternalUserDAO []> {
    return await this.repo.find(); 
  }
}

export default InternalUserRepository;
