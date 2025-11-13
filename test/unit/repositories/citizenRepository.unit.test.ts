// test/unit/repositories/citizenRepository.unit.test.ts
import CitizenRepository from '../../../src/repositories/implementation/CitizenRepository';
import CitizenDAO from '../../../src/models/dao/CitizenDAO';
import type { Repository, SelectQueryBuilder } from 'typeorm';

function makeQbMock<T extends object>() {
    const qb: any = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
    };
    return qb as SelectQueryBuilder<T>;
}

describe('CitizenRepository', () => {
    let repoUnderTest: CitizenRepository;
    let ormRepoMock: jest.Mocked<Repository<CitizenDAO>>;
    let qb: SelectQueryBuilder<CitizenDAO>;

    beforeEach(() => {
        qb = makeQbMock<CitizenDAO>();

        ormRepoMock = {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(qb),
        } as any;
        const fakeDS = { getRepository: jest.fn().mockReturnValue(ormRepoMock) };
        repoUnderTest = new CitizenRepository(fakeDS as any);
    });

    afterEach(() => jest.clearAllMocks());

    it('create(): calls create + save and returns saved entity', async () => {
        const partial = { email: 'a@b.com' } as Partial<CitizenDAO>;
        const created = { id: 1, ...partial } as CitizenDAO;

        ormRepoMock.create.mockReturnValue(created);
        ormRepoMock.save.mockResolvedValue(created);

        const res = await repoUnderTest.create(partial);

        expect(ormRepoMock.create).toHaveBeenCalledWith(partial);
        expect(ormRepoMock.save).toHaveBeenCalledWith(created);
        expect(res).toBe(created);
    });

    it('findByEmail(): default does NOT addSelect(password)', async () => {
        const citizen = { id: 2, email: 'x@y.com' } as CitizenDAO;
        (qb.getOne as jest.Mock).mockResolvedValue(citizen);

        const res = await repoUnderTest.findByEmail('X@Y.COM');

        expect(ormRepoMock.createQueryBuilder).toHaveBeenCalledWith('citizen');
        expect((qb.where as jest.Mock)).toHaveBeenCalledWith(
            'LOWER(citizen.email) = LOWER(:email)',
            { email: 'X@Y.COM' },
        );
        expect((qb.addSelect as jest.Mock)).not.toHaveBeenCalled();
        expect(res).toBe(citizen);
    });

    it('findByEmail(): withPassword=true adds select', async () => {
        const citizen = { id: 3, email: 'a@b.com', password: 'hashed' } as CitizenDAO;
        (qb.getOne as jest.Mock).mockResolvedValue(citizen);

        const res = await repoUnderTest.findByEmail('a@b.com', { withPassword: true });

        expect((qb.addSelect as jest.Mock)).toHaveBeenCalledWith('citizen.password');
        expect(res).toBe(citizen);
    });

    it('findByUsername(): uses findOne(where)', async () => {
        const citizen = { id: 10, username: 'srbuhi' } as CitizenDAO;
        ormRepoMock.findOne.mockResolvedValue(citizen);

        const res = await repoUnderTest.findByUsername('srbuhi');

        expect(ormRepoMock.findOne).toHaveBeenCalledWith({ where: { username: 'srbuhi' } });
        expect(res).toBe(citizen);
    });

    it('update(): forwards id selector and patch', async () => {
        await repoUnderTest.update(42, { firstName: 'New' });
        expect(ormRepoMock.update).toHaveBeenCalledWith({ id: 42 }, { firstName: 'New' });
    });
});