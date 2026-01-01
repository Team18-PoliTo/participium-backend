import { Repository } from "typeorm";
import { AppDataSource } from "../../config/database";
import InternalUserRoleDAO from "../../models/dao/InternalUserRoleDAO";

export interface IInternalUserRoleRepository {
  deleteByInternalUserId(internalUserId: number): Promise<void>;
}

export class InternalUserRoleRepository implements IInternalUserRoleRepository {
  private readonly repo: Repository<InternalUserRoleDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(InternalUserRoleDAO);
  }

  async deleteByInternalUserId(internalUserId: number): Promise<void> {
    await this.repo.delete({
      internalUser: { id: internalUserId },
    });
  }
}
