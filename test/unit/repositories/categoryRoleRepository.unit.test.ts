// test/unit/repositories/categoryRoleRepository.unit.test.ts
import { Repository } from "typeorm";
import CategoryRoleDAO from "../../../src/models/dao/CategoryRoleDAO";
import { CategoryRoleRepository } from "../../../src/repositories/implementation/CategoryRoleRepository";

describe("CategoryRoleRepository", () => {
    let mockRepo: jest.Mocked<Repository<CategoryRoleDAO>>;
    let repository: CategoryRoleRepository;

    beforeEach(() => {
        mockRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<Repository<CategoryRoleDAO>>;

        repository = new CategoryRoleRepository(mockRepo);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("findByRoleId should call repo.find with role.id and relations", async () => {
        const items = [
            { id: 1 } as CategoryRoleDAO,
            { id: 2 } as CategoryRoleDAO,
        ];
        mockRepo.find.mockResolvedValue(items);

        const result = await repository.findByRoleId(5);

        expect(mockRepo.find).toHaveBeenCalledWith({
            where: { role: { id: 5 } },
            relations: ["category", "role"],
        });
        expect(result).toBe(items);
    });

    it("findByCategoryId should call repo.find with category.id and relations", async () => {
        const items = [{ id: 3 } as CategoryRoleDAO];
        mockRepo.find.mockResolvedValue(items);

        const result = await repository.findByCategoryId(7);

        expect(mockRepo.find).toHaveBeenCalledWith({
            where: { category: { id: 7 } },
            relations: ["category", "role"],
        });
        expect(result).toBe(items);
    });

    it("findRoleByCategory should call repo.findOne with category.name and relations", async () => {
        const item = { id: 4 } as CategoryRoleDAO;
        mockRepo.findOne.mockResolvedValue(item);

        const result = await repository.findRoleByCategory("Garbage");

        expect(mockRepo.findOne).toHaveBeenCalledWith({
            where: { category: { name: "Garbage" } },
            relations: ["role", "role.office"],
        });
        expect(result).toBe(item);
    });

    it("create should call repo.create and repo.save", async () => {
        const payload: Partial<CategoryRoleDAO> = {
            id: 10 as unknown as never,
        };
        const created = { id: 10 } as CategoryRoleDAO;

        mockRepo.create.mockReturnValue(created);
        mockRepo.save.mockResolvedValue(created);

        const result = await repository.create(payload);

        expect(mockRepo.create).toHaveBeenCalledWith(payload);
        expect(mockRepo.save).toHaveBeenCalledWith(created);
        expect(result).toBe(created);
    });

    it("findCategoriesByOffice should return mapped categories", async () => {
        const category1 = { id: 1, name: "C1" };
        const category2 = { id: 2, name: "C2" };
        
        const results = [
            { category: category1 },
            { category: category2 }
        ] as CategoryRoleDAO[];

        mockRepo.find.mockResolvedValue(results);

        const categories = await repository.findCategoriesByOffice(99);

        expect(mockRepo.find).toHaveBeenCalledWith({
            where: {
                role: {
                    office: { id: 99 },
                },
            },
            relations: ["category", "role", "role.office"],
        });
        expect(categories).toEqual([category1, category2]);
    });
});