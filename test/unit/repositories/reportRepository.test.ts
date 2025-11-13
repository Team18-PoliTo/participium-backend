import { AppDataSource } from "../../../src/config/database";
import { ReportRepository } from "../../../src/repositories/implementation/ReportRepository";
import ReportDAO from "../../../src/models/dao/ReportDAO";

describe("ReportRepository", () => {
  const save = jest.fn();
  const create = jest.fn();
  const findOne = jest.fn();
  let repoSpy: jest.SpyInstance;

  beforeEach(() => {
    repoSpy = jest.spyOn(AppDataSource, "getRepository").mockReturnValue({
      create,
      save,
      findOne,
    } as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    repoSpy.mockRestore();
  });

  it("create proxies to underlying repository", async () => {
    const repo = new ReportRepository();
    const dto = { title: "Report" } as ReportDAO;
    create.mockReturnValue(dto);
    save.mockResolvedValue({ ...dto, id: 1 });

    const result = await repo.create(dto);

    expect(create).toHaveBeenCalledWith(dto);
    expect(save).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ ...dto, id: 1 });
  });

  it("findById forwards relation lookup", async () => {
    const repo = new ReportRepository();
    findOne.mockResolvedValue({ id: 10 });

    const result = await repo.findById(10);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 10 },
      relations: ["citizen"],
    });
    expect(result).toEqual({ id: 10 });
  });

  it("update uses save and returns updated entity", async () => {
    const repo = new ReportRepository();
    save.mockResolvedValue({ id: 2, title: "Updated" });

    const result = await repo.update({ id: 2, title: "Updated" });

    expect(save).toHaveBeenCalledWith({ id: 2, title: "Updated" });
    expect(result).toEqual({ id: 2, title: "Updated" });
  });
});
