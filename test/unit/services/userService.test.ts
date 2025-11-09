// test/unit/services/userService.test.ts

// --- Mock bcrypt and jwt BEFORE importing the service ---
jest.mock('bcrypt', () => ({
    __esModule: true,
    hash: jest.fn(async () => 'hashed-pass'),
    compare: jest.fn(async () => true), // default: password always matches
    default: {
        hash: jest.fn(async () => 'hashed-pass'),
        compare: jest.fn(async () => true),
    },
}));

jest.mock('jsonwebtoken', () => {
    const sign = jest.fn(() => 'token-123');
    return { __esModule: true, default: { sign }, sign };
});

import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { LoginRequestDTO } from '../../../src/models/dto/LoginRequestDTO';

// Mock UserMapper (named export)
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

import { IUserRepository } from '../../../src/repositories/IUserRepository';

describe('UserService — stable nuclear mode', () => {
    let repo: jest.Mocked<IUserRepository>;
    let service: any;

    const userBase: any = {
        id: 42,
        email: 's337777@studenti.polito.it',
        username: 'srbuhi99',
        firstName: 'Srbuhi',
        lastName: 'Danielyan',
        createdAt: new Date(),
        password: 'stored-hash',
        role: 'user',
    };

    // Ensures the service is loaded AFTER mocks
    function loadService() {
        jest.isolateModules(() => {
            const Svc = require('../../../src/services/implementation/userService').default;
            service = new Svc(repo);
        });
    }

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'dev-secret';

        repo = {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
        } as any;

        loadService();
    });

    // ---------- REGISTER TESTS ----------

    it('register: fails when email already exists', async () => {
        repo.findByEmail.mockResolvedValueOnce(userBase);

        await expect(
            service.register({
                email: userBase.email,
                username: 'another',
                password: 'pass',
                firstName: 'f',
                lastName: 'l',
            }),
        ).rejects.toThrow('User with this email already exists');
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
            }),
        ).rejects.toThrow('User with this username already exists');
    });

    // ---------- LOGIN TESTS ----------

    it('login: success — returns token and DTO, resets failed attempts', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...userBase,
            failedLoginAttempts: 3,
            password: 'hashed-pass', // ensure password is available
        });

        // Force bcrypt.compare and jwt.sign to match service runtime usage
        (bcrypt as any).compare = jest.fn(async () => true);
        (jwt as any).sign = jest.fn(() => 'token-123');

        const result = await service.login({
            email: userBase.email,
            password: 'StrongPass123!',
        } as LoginRequestDTO);

        expect(repo.update).toHaveBeenCalledWith(userBase.id, {
            failedLoginAttempts: 0,
            lastLoginAt: expect.any(Date),
        });

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
            service.login({ email: 'x@x.com', password: 'p' }),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).not.toHaveBeenCalled();
    });

    it('login: wrong password — increments failedLoginAttempts', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...userBase,
            failedLoginAttempts: 1,
            password: 'hashed-pass',
        });

        (bcrypt as any).compare = jest.fn(async () => false); // force incorrect password

        await expect(
            service.login({ email: userBase.email, password: 'wrong' }),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).toHaveBeenCalledWith(userBase.id, { failedLoginAttempts: 2 });
    });

    it('disableUserById: when user exists -> calls findById(id), sets deletedAt and returns ok', async () => {
        repo.findById.mockResolvedValueOnce({ id: 123 } as any);

        const fixed = new Date('2024-01-02T03:04:05.000Z');
        jest.useFakeTimers().setSystemTime(fixed);

        const res = await service.disableUserById(123);

        expect(repo.findById).toHaveBeenCalledWith(123);
        expect(repo.update).toHaveBeenCalledTimes(1);

        const [selector, patch] = (repo.update as jest.Mock).mock.calls[0];
        expect(selector).toBe(123);
        expect(patch).toEqual(expect.objectContaining({ deletedAt: expect.any(Date) }));
        expect((patch as any).deletedAt.toISOString()).toBe(fixed.toISOString());

        expect(res).toBe('ok');

        jest.useRealTimers();
    });


    it('disableUserById: when user does not exist -> returns not_found and does not call update', async () => {
        repo.findById.mockResolvedValueOnce(null);

        const res = await service.disableUserById(555);

        expect(repo.findById).toHaveBeenCalledWith(555);
        expect(repo.update).not.toHaveBeenCalled();
        expect(res).toBe('not_found');
    });

});