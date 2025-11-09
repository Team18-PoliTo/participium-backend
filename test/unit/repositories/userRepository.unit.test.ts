// test/unit/repositories/userRepository.unit.test.ts
import UserRepository from '../../../src/repositories/implementation/UserRepository';
import UserDAO from '../../../src/models/dao/UserDAO';
import type { Repository, SelectQueryBuilder } from 'typeorm';

function makeQbMock<T extends object>() {
    const qb: any = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
    };
    return qb as SelectQueryBuilder<T>;
}

describe('UserRepository', () => {
    let repoUnderTest: UserRepository;
    let ormRepoMock: jest.Mocked<Repository<UserDAO>>;
    let qb: SelectQueryBuilder<UserDAO>;

    beforeEach(() => {
        qb = makeQbMock<UserDAO>();

        ormRepoMock = {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(qb),
        } as any;
        const fakeDS = { getRepository: jest.fn().mockReturnValue(ormRepoMock) };
        repoUnderTest = new UserRepository(fakeDS as any);
    });

    afterEach(() => jest.clearAllMocks());

    it('create(): calls create + save and returns saved entity', async () => {
        const partial = { email: 'a@b.com' } as Partial<UserDAO>;
        const created = { id: 1, ...partial } as UserDAO;

        ormRepoMock.create.mockReturnValue(created);
        ormRepoMock.save.mockResolvedValue(created);

        const res = await repoUnderTest.create(partial);

        expect(ormRepoMock.create).toHaveBeenCalledWith(partial);
        expect(ormRepoMock.save).toHaveBeenCalledWith(created);
        expect(res).toBe(created);
    });

    it('findByEmail(): default does NOT addSelect(password)', async () => {
        const user = { id: 2, email: 'x@y.com' } as UserDAO;
        (qb.getOne as jest.Mock).mockResolvedValue(user);

        const res = await repoUnderTest.findByEmail('X@Y.COM');

        expect(ormRepoMock.createQueryBuilder).toHaveBeenCalledWith('user');
        expect((qb.where as jest.Mock)).toHaveBeenCalledWith(
            'LOWER(user.email) = LOWER(:email)',
            { email: 'X@Y.COM' },
        );
        expect((qb.addSelect as jest.Mock)).not.toHaveBeenCalled();
        expect(res).toBe(user);
    });

    it('findByEmail(): withPassword=true adds select', async () => {
        const user = { id: 3, email: 'a@b.com', password: 'hashed' } as UserDAO;
        (qb.getOne as jest.Mock).mockResolvedValue(user);

        const res = await repoUnderTest.findByEmail('a@b.com', { withPassword: true });

        expect((qb.addSelect as jest.Mock)).toHaveBeenCalledWith('user.password');
        expect(res).toBe(user);
    });

    it('findByUsername(): uses findOne(where)', async () => {
        const user = { id: 10, username: 'srbuhi' } as UserDAO;
        ormRepoMock.findOne.mockResolvedValue(user);

        const res = await repoUnderTest.findByUsername('srbuhi');

        expect(ormRepoMock.findOne).toHaveBeenCalledWith({ where: { username: 'srbuhi' } });
        expect(res).toBe(user);
    });

    it('findById(): calls findOne with id', async () => {
        const user = { id: 55, email: 'u@test.com' } as UserDAO;
        ormRepoMock.findOne.mockResolvedValue(user);

        const res = await repoUnderTest.findById(55);

        expect(ormRepoMock.findOne).toHaveBeenCalledWith({ where: { id: 55 } });
        expect(res).toBe(user);
    });


    it('update(): forwards id selector and patch', async () => {
        await repoUnderTest.update(42, { firstName: 'New' });
        expect(ormRepoMock.update).toHaveBeenCalledWith({ id: 42 }, { firstName: 'New' });
    });
});