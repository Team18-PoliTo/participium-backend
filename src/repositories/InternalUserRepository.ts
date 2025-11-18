import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import InternalUserDAO from "../models/dao/InternalUserDAO";

interface IInternalUserRepository {
  create(user: InternalUserDAO): Promise<InternalUserDAO>;
  findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  update(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO []>;
  findByRoleId(roleId: number): Promise<InternalUserDAO[]>;
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
  async findByEmail(
    email: string,
    opts?: { withPassword?: boolean }
  ): Promise<InternalUserDAO | null> {
    const qb = this.repo
      .createQueryBuilder("internalUser")
      .leftJoinAndSelect("internalUser.role", "role")
      .where("LOWER(internalUser.email) = LOWER(:email)", { email });
    if (opts?.withPassword) qb.addSelect("internalUser.password");
    return await qb.getOne();
  }
  async findById(id: number): Promise<InternalUserDAO | null> {
    // include role relation so callers receive the role entity populated
    return await this.repo.findOne({ where: { id }, relations: ["role"] });
  }
  async update(user: InternalUserDAO): Promise<InternalUserDAO> {
    return await this.repo.save(user);
  }
  async fetchAll(): Promise<InternalUserDAO []> {
    return await this.repo.find({ relations: ["role"] }); 
  }

  async findByRoleId(roleId: number): Promise<InternalUserDAO[]> {
    return await this.repo.find({
      where: { role: { id: roleId } },
      relations: ["role"],
    });
  }
}

export default InternalUserRepository;
