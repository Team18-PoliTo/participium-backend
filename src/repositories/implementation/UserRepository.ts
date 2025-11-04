import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import UserDAO from "../../models/dao/UserDAO";
import { IUserRepository } from "../IUserRepository";

export class UserRepository implements IUserRepository {
  private readonly repo: Repository<UserDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(UserDAO);
  }

  async create(user: Partial<UserDAO>): Promise<UserDAO> {
    const newUser = this.repo.create(user);
    return await this.repo.save(newUser);
  }

  async findByEmail(
      email: string,
      opts?: { withPassword?: boolean }
  ): Promise<UserDAO | null> {
    const qb = this.repo
        .createQueryBuilder("user")
        .where("LOWER(user.email) = LOWER(:email)", { email });

    if (opts?.withPassword) qb.addSelect("user.password");

    return await qb.getOne();
  }

  async findByUsername(username: string): Promise<UserDAO | null> {
    return await this.repo.findOne({ where: { username } });
  }

  async update(id: number, patch: Partial<UserDAO>): Promise<void> {
    await this.repo.update({ id }, patch);
  }
}

export default UserRepository;


