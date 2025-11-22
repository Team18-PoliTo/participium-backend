import TempFileDAO from "../models/dao/TempFileDAO";

export interface ITempFileRepository {
  create(tempFile: Partial<TempFileDAO>): Promise<TempFileDAO>;
  findByFileId(fileId: string): Promise<TempFileDAO | null>;
  findExpired(): Promise<TempFileDAO[]>;
  delete(id: number): Promise<void>;
}

