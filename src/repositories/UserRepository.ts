import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import UserDAO from "../models/dao/UserDAO";

interface IUserRepository {
  create(user: Partial<UserDAO>): Promise<UserDAO>;
  findByEmail(email: string): Promise<UserDAO | null>;
  findByUsername(username: string): Promise<UserDAO | null>;
}

export class UserRepository implements IUserRepository {
  constructor(
    private readonly repo: Repository<UserDAO> = AppDataSource.getRepository(UserDAO)
  ) {}

  async create(user: Partial<UserDAO>): Promise<UserDAO> {
    const newUser = this.repo.create(user);
    return await this.repo.save(newUser);
  }

  async findByEmail(email: string): Promise<UserDAO | null> {
    return await this.repo.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<UserDAO | null> {
    return await this.repo.findOne({ where: { username } });
  }
}

export default UserRepository;

