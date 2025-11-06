import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import InternalUserDAO from "../models/dao/InternalUserDAO";

interface IInternalUserRepository {
  create(user: InternalUserDAO): Promise<InternalUserDAO>;
  findByEmail(email: string): Promise<InternalUserDAO | null>;
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
}

export default InternalUserRepository;
