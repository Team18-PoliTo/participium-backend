// test/unit/services/userService.test.ts
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import UserService from '../../../src/services/implementation/userService';
import { IUserRepository } from '../../../src/repositories/IUserRepository';
import UserDAO from '../../../src/models/dao/UserDAO';
import { RegisterRequestDTO } from '../../../src/models/dto/RegisterRequestDTO';
import { LoginRequestDTO } from '../../../src/models/dto/LoginRequestDTO';

// Mock the mapper as a named export: `export const UserMapper = { toDTO: ... }`
jest.mock('../../../src/mappers/UserMapper', () => ({
    UserMapper: {
        toDTO: (u: any) => ({
            id: u.id,
            email: u.email,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            createdAt: u.createdAt,
        }),
    },
}));

// Mock crypto libs
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('UserService - register & login', () => {
    let repo: jest.Mocked<IUserRepository>;
    let service: UserService;

    const now = new Date();

    const userBase: UserDAO = {
        id: 42,
        email: 's337777@studenti.polito.it',
        username: 'srbuhi99',
        firstName: 'Srbuhi',
        lastName: 'Danielyan',
        password: '$2b$10$hashhashhashhashhashhash',
        createdAt: now,
    } as any;

    beforeEach(() => {
        repo = {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            update: jest.fn(),
        } as any;

        service = new UserService(repo);
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'dev-secret';
    });

    // ---------- REGISTER ----------

    it('register: success — hashes password and creates user', async () => {
        const dto: RegisterRequestDTO = {
            email: 'S337777@studenti.polito.it', // will be normalized to lowercase
            username: 'SrBuHi99',                 // will be normalized to lowercase
            password: 'StrongPass123!',
            firstName: 'Srbuhi',
            lastName: 'Danielyan',
        } as any;

        repo.findByEmail.mockResolvedValueOnce(null);
        repo.findByUsername.mockResolvedValueOnce(null);
        mockedBcrypt.hash.mockResolvedValueOnce('hashed_pw' as any);

        repo.create.mockResolvedValueOnce({
            ...userBase,
            email: 's337777@studenti.polito.it',
            username: 'srbuhi99',
            password: 'hashed_pw',
        });

        const result = await service.register(dto);

        expect(repo.findByEmail).toHaveBeenCalledWith('s337777@studenti.polito.it');
        expect(repo.findByUsername).toHaveBeenCalledWith('srbuhi99');
        expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith('StrongPass123!', 10);

        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 's337777@studenti.polito.it',
                username: 'srbuhi99',
                firstName: 'Srbuhi',
                lastName: 'Danielyan',
                password: 'hashed_pw',
            }),
        );

        // DTO returned (no password)
        expect(result).toEqual(
            expect.objectContaining({
                id: 42,
                email: 's337777@studenti.polito.it',
                username: 'srbuhi99',
                firstName: 'Srbuhi',
                lastName: 'Danielyan',
                createdAt: now,
            }),
        );
    });

    it('register: fails when email already exists', async () => {
        repo.findByEmail.mockResolvedValueOnce(userBase);

        await expect(
            service.register({
                email: userBase.email,
                username: 'another',
                password: 'pass',
                firstName: 'f',
                lastName: 'l',
            } as any),
        ).rejects.toThrow('User with this email already exists');

        expect(repo.findByEmail).toHaveBeenCalled();
        expect(repo.findByUsername).not.toHaveBeenCalled();
    });

    it('register: fails when username already exists', async () => {
        repo.findByEmail.mockResolvedValueOnce(null);
        repo.findByUsername.mockResolvedValueOnce(userBase);

        await expect(
            service.register({
                email: 'new@polito.it',
                username: userBase.username,
                password: 'p',
                firstName: 'f',
                lastName: 'l',
            } as any),
        ).rejects.toThrow('User with this username already exists');
    });

    // ---------- LOGIN ----------

    it('login: success — returns token and DTO, resets failed attempts', async () => {
        const loginDto: LoginRequestDTO = {
            email: userBase.email,
            password: 'StrongPass123!',
        } as any;

        repo.findByEmail.mockResolvedValueOnce({
            ...userBase,
            failedLoginAttempts: 3,
        } as any);

        (mockedBcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
        (mockedJwt.sign as jest.Mock).mockReturnValue('token-123');

        const result = await service.login(loginDto);

        expect(repo.findByEmail).toHaveBeenCalledWith(userBase.email, { withPassword: true });
        expect(mockedBcrypt.compare).toHaveBeenCalledWith('StrongPass123!', userBase.password);
        expect(repo.update).toHaveBeenCalledWith(userBase.id, {
            failedLoginAttempts: 0,
            lastLoginAt: expect.any(Date),
        });
        expect(mockedJwt.sign).toHaveBeenCalledWith(
            { id: userBase.id, email: userBase.email, role: (userBase as any).role },
            'dev-secret',
            { expiresIn: '1h' },
        );
        expect(result).toEqual({
            token: 'token-123',
            user: expect.objectContaining({
                id: 42,
                email: userBase.email,
                username: userBase.username,
            }),
        });
    });

    it('login: throws when email not found', async () => {
        repo.findByEmail.mockResolvedValueOnce(null);

        await expect(
            service.login({ email: 'x@x.com', password: 'p' } as any),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).not.toHaveBeenCalled();
    });

    it('login: wrong password — increments failedLoginAttempts', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...userBase,
            failedLoginAttempts: 1,
        } as any);

        (mockedBcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

        await expect(
            service.login({ email: userBase.email, password: 'wrong' } as any),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).toHaveBeenCalledWith(userBase.id, {
            failedLoginAttempts: 2, // 1 + 1
        });
    });
});

