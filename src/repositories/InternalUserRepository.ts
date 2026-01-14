import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import InternalUserDAO from "../models/dao/InternalUserDAO";

interface IInternalUserRepository {
  create(user: InternalUserDAO): Promise<InternalUserDAO>;
  findByEmail(
    email: string,
    opts?: { withPassword?: boolean }
  ): Promise<InternalUserDAO | null>;
  findById(id: number): Promise<InternalUserDAO | null>;
  save(user: InternalUserDAO): Promise<InternalUserDAO>;
  fetchAll(): Promise<InternalUserDAO[]>;
  findByRoleId(roleId: number): Promise<InternalUserDAO[]>;
  incrementActiveTasks(userId: number): Promise<void>;
  decrementActiveTasks(userId: number): Promise<void>;
  findByIdWithRoleAndOffice(id: number): Promise<InternalUserDAO | null>;
  findExternalMaintainersByCompany(
    companyId: number
  ): Promise<InternalUserDAO[]>;
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
      .leftJoinAndSelect("internalUser.roles", "roles")
      .leftJoinAndSelect("internalUser.company", "company")
      .where("LOWER(internalUser.email) = LOWER(:email)", { email });

    if (opts?.withPassword) {
      qb.addSelect("internalUser.password");
    }
    return await qb.getOne();
  }

  async findById(id: number): Promise<InternalUserDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: [
        "roles",
        "roles.role",
        "roles.role.office",
        "roles.role.categoryRoles",
        "roles.role.categoryRoles.category",
        "company",
      ],
    });
  }

  async save(user: InternalUserDAO): Promise<InternalUserDAO> {
    return await this.repo.save(user);
  }

  async fetchAll(): Promise<InternalUserDAO[]> {
    return await this.repo.find({
      relations: ["roles", "roles.role", "roles.role.office", "company"],
    });
  }

  async findByRoleId(roleId: number): Promise<InternalUserDAO[]> {
    return await this.repo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "ur")
      .leftJoinAndSelect("ur.role", "role")
      .leftJoinAndSelect("user.company", "company")
      .where("ur.roleId = :roleId", { roleId })
      .getMany();
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
      .set({ activeTasks: () => "MAX(activeTasks - 1, 0)" })
      .where("id = :id", { id: userId })
      .execute();
  }

  async findByIdWithRoleAndOffice(id: number): Promise<InternalUserDAO | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ["roles", "roles.role", "roles.role.office", "company"],
    });
  }

  async findExternalMaintainersByCompany(
    companyId: number
  ): Promise<InternalUserDAO[]> {
    return this.repo
      .createQueryBuilder("user")
      .innerJoinAndSelect(
        "user.company",
        "company",
        "company.id = :companyId",
        {
          companyId,
        }
      )
      .innerJoin("user.roles", "ur")
      .innerJoinAndSelect("ur.role", "role")
      .where("role.id = :roleId", { roleId: 28 })
      .orderBy("user.activeTasks", "ASC")
      .getMany();
  }
}

export default InternalUserRepository;
