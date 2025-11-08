// src/repositories/implementation/UserRepository.ts
import { Repository, DataSource } from 'typeorm';
import UserDAO from '../../models/dao/UserDAO';
import { AppDataSource } from '../../config/database';
import { IUserRepository } from '../IUserRepository';

export class UserRepository implements IUserRepository {
  private readonly repo: Repository<UserDAO>;

  constructor(private readonly ds: Pick<DataSource, 'getRepository'> = AppDataSource) {
    this.repo = this.ds.getRepository(UserDAO);
  }

  async create(user: Partial<UserDAO>): Promise<UserDAO> {
    const entity = this.repo.create(user);
    return await this.repo.save(entity);
  }

  async findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<UserDAO | null> {
    const qb = this.repo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email });
    if (opts?.withPassword) qb.addSelect('user.password');
    return await qb.getOne();
  }

  async findByUsername(username: string): Promise<UserDAO | null> {
    return await this.repo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<UserDAO | null> {
    return await this.repo.findOne({ where: { id } });
  }

  async update(id: number, patch: Partial<UserDAO>): Promise<void> {
    await this.repo.update({ id }, patch);
  }
}

export default UserRepository;