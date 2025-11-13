import CitizenDAO from "../models/dao/CitizenDAO";

export interface ICitizenRepository {
    create(citizen: Partial<CitizenDAO>): Promise<CitizenDAO>;
    findById(id: number): Promise<CitizenDAO | null>;
    findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<CitizenDAO | null>;
    findByUsername(username: string): Promise<CitizenDAO | null>;
    update(id: number, patch: Partial<CitizenDAO>): Promise<void>;
}