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
  incrementActiveTasks(userId: number): Promise<void>;
  decrementActiveTasks(userId: number): Promise<void>;
  findByIdWithRoleAndOffice(id: number): Promise<InternalUserDAO | null>;
  findExternalMaintainersByCompany(companyId: number): Promise<InternalUserDAO[]>;
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
      .leftJoinAndSelect("internalUser.company", "company")
      .where("LOWER(internalUser.email) = LOWER(:email)", { email });
    if (opts?.withPassword) qb.addSelect("internalUser.password");
    return await qb.getOne();
  }

  async findById(id: number): Promise<InternalUserDAO | null> {
    // include role and company relations so callers receive the entities populated
    return await this.repo.findOne({ 
      where: { id }, 
      relations: ["role", "company"] 
    });
  }

  async update(user: InternalUserDAO): Promise<InternalUserDAO> {
    return await this.repo.save(user);
  }

  async fetchAll(): Promise<InternalUserDAO []> {
    return await this.repo.find({ 
      relations: ["role", "company"] 
    }); 
  }

  async findByRoleId(roleId: number): Promise<InternalUserDAO[]> {
    return await this.repo.find({
      where: { role: { id: roleId } },
      relations: ["role", "company"],
    });
  }

  async incrementActiveTasks(userId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(InternalUserDAO)
      .set({ activeTasks: () => "activeTasks + 1" })
      .where("id = :id", { id: userId })
      .execute();
  }

  async decrementActiveTasks(userId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(InternalUserDAO)
      .set({ activeTasks: () => "GREATEST(activeTasks - 1, 0)" })
      .where("id = :id", { id: userId })
      .execute();
  }

  async findByIdWithRoleAndOffice(id: number): Promise<InternalUserDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["role", "role.office", "company"],
    });
  }


  async findExternalMaintainersByCompany(companyId: number): Promise<InternalUserDAO[]> {
    return await this.repo.find({
      where: {
        role: { id: 28 },
        company: { id: companyId },
      },
      relations: ["role", "company"],
      order: { activeTasks: "ASC" },
    });
  }
}

export default InternalUserRepository;