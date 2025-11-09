import UserDAO from "../models/dao/UserDAO";

export interface IUserRepository {
    create(user: Partial<UserDAO>): Promise<UserDAO>;
    findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<UserDAO | null>;
    findByUsername(username: string): Promise<UserDAO | null>;
    update(id: number, patch: Partial<UserDAO>): Promise<void>;
}