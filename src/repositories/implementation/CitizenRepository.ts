import { Repository, DataSource } from "typeorm";
import CitizenDAO from "../../models/dao/CitizenDAO";
import { AppDataSource } from "../../config/database";
import { ICitizenRepository } from "../ICitizenRepository";

export class CitizenRepository implements ICitizenRepository {
  private readonly repo: Repository<CitizenDAO>;

  constructor(
    private readonly ds: Pick<DataSource, "getRepository"> = AppDataSource
  ) {
    this.repo = this.ds.getRepository(CitizenDAO);
  }

  async create(citizen: Partial<CitizenDAO>): Promise<CitizenDAO> {
    const entity = this.repo.create(citizen);
    return await this.repo.save(entity);
  }

  async findById(id: number): Promise<CitizenDAO | null> {
    return await this.repo.findOne({ where: { id } });
  }

  async findByEmail(
    email: string,
    opts?: { withPassword?: boolean; withVerificationCode?: boolean }
  ): Promise<CitizenDAO | null> {
    const qb = this.repo
      .createQueryBuilder("citizen")
      .where("LOWER(citizen.email) = LOWER(:email)", { email });
    if (opts?.withPassword) qb.addSelect("citizen.password");
    if (opts?.withVerificationCode) {
      qb.addSelect("citizen.verificationCode");
      qb.addSelect("citizen.verificationCodeExpiresAt");
    }
    return await qb.getOne();
  }

  async findByUsername(username: string): Promise<CitizenDAO | null> {
    return await this.repo.findOne({ where: { username } });
  }

  async update(id: number, patch: Partial<CitizenDAO>): Promise<void> {
    await this.repo.update({ id }, patch);
  }
}

export default CitizenRepository;
