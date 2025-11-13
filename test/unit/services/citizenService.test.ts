// test/unit/services/citizenService.test.ts

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

// Mock CitizenMapper (named export)
jest.mock('../../../src/mappers/CitizenMapper', () => ({
    CitizenMapper: {
        toDTO: (u: any) => ({
            id: u.id,
            email: u.email,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            status: u.status ?? 'ACTIVE',
            createdAt: u.createdAt,
        }),
    },
}));

import { ICitizenRepository } from '../../../src/repositories/ICitizenRepository';

describe('CitizenService — stable nuclear mode', () => {
    let repo: jest.Mocked<ICitizenRepository>;
    let service: any;

    const citizenBase: any = {
        id: 42,
        email: 's337777@studenti.polito.it',
        username: 'srbuhi99',
        firstName: 'Srbuhi',
        lastName: 'Danielyan',
        createdAt: new Date(),
        password: 'stored-hash',
        status: 'ACTIVE',
    };

    // Ensures the service is loaded AFTER mocks
    function loadService() {
        jest.isolateModules(() => {
            const Svc = require('../../../src/services/implementation/citizenService').default;
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
        } as any;

        loadService();
    });

    // ---------- REGISTER TESTS ----------

    it('register: fails when email already exists', async () => {
        repo.findByEmail.mockResolvedValueOnce(citizenBase);

        await expect(
            service.register({
                email: citizenBase.email,
                username: 'another',
                password: 'pass',
                firstName: 'f',
                lastName: 'l',
            }),
        ).rejects.toThrow('Citizen with this email already exists');
    });

    it('register: fails when username already exists', async () => {
        repo.findByEmail.mockResolvedValueOnce(null);
        repo.findByUsername.mockResolvedValueOnce(citizenBase);

        await expect(
            service.register({
                email: 'new@polito.it',
                username: citizenBase.username,
                password: 'p',
                firstName: 'f',
                lastName: 'l',
            }),
        ).rejects.toThrow('Citizen with this username already exists');
    });

    it('register: creates citizen when email and username are free', async () => {
        repo.findByEmail.mockResolvedValueOnce(null);
        repo.findByUsername.mockResolvedValueOnce(null);
        const created = {
            ...citizenBase,
            email: 'fresh@polito.it',
            username: 'freshuser',
            id: 77,
        };
        repo.create.mockResolvedValueOnce(created);

        const dto = await service.register({
            email: 'fresh@polito.it',
            username: 'FreshUser',
            password: 'strong',
            firstName: 'Fresh',
            lastName: 'User',
        });

        expect(repo.create).toHaveBeenCalledWith({
            email: 'fresh@polito.it',
            username: 'freshuser',
            firstName: 'Fresh',
            lastName: 'User',
            password: 'hashed-pass',
            status: 'ACTIVE',
        });
        expect(dto).toEqual(
            expect.objectContaining({
                id: 77,
                email: 'fresh@polito.it',
                username: 'freshuser',
                status: 'ACTIVE',
            })
        );
    });

    // ---------- LOGIN TESTS ----------

    it('login: success — returns token and DTO, resets failed attempts', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...citizenBase,
            failedLoginAttempts: 3,
            password: 'hashed-pass', // ensure password is available
        });

        // Force bcrypt.compare and jwt.sign to match service runtime usage
        (bcrypt as any).compare = jest.fn(async () => true);
        (jwt as any).sign = jest.fn(() => 'token-123');

        const result = await service.login({
            email: citizenBase.email,
            password: 'StrongPass123!',
        } as LoginRequestDTO);

        expect(repo.update).toHaveBeenCalledWith(citizenBase.id, {
            failedLoginAttempts: 0,
            lastLoginAt: expect.any(Date),
        });

        expect(result).toEqual({ access_token: 'token-123', token_type: 'bearer' });
    });

    it('login: treats missing status as ACTIVE and resets counters', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...citizenBase,
            status: undefined,
            failedLoginAttempts: undefined,
            password: 'hashed-pass',
        });
        (bcrypt as any).compare = jest.fn(async () => true);
        (jwt as any).sign = jest.fn(() => 'token-abc');

        const result = await service.login({
            email: citizenBase.email,
            password: 'pass123',
        } as LoginRequestDTO);

        expect(repo.update).toHaveBeenCalledWith(citizenBase.id, {
            failedLoginAttempts: 0,
            lastLoginAt: expect.any(Date),
        });
        expect(result).toEqual({ access_token: 'token-abc', token_type: 'bearer' });
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
            ...citizenBase,
            failedLoginAttempts: 1,
            password: 'hashed-pass',
        });

        (bcrypt as any).compare = jest.fn(async () => false); // force incorrect password

        await expect(
            service.login({ email: citizenBase.email, password: 'wrong' }),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).toHaveBeenCalledWith(citizenBase.id, { failedLoginAttempts: 2 });
    });

    it('login: wrong password defaults failed attempts to 0 when missing', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...citizenBase,
            failedLoginAttempts: undefined,
            password: 'hashed-pass',
        });

        (bcrypt as any).compare = jest.fn(async () => false);

        await expect(
            service.login({ email: citizenBase.email, password: 'oops' }),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).toHaveBeenCalledWith(citizenBase.id, { failedLoginAttempts: 1 });
    });

    it('login: throws when status is not ACTIVE', async () => {
        repo.findByEmail.mockResolvedValueOnce({
            ...citizenBase,
            status: 'SUSPENDED',
        });

        await expect(
            service.login({ email: citizenBase.email, password: 'whatever' }),
        ).rejects.toThrow('Invalid credentials');

        expect(repo.update).not.toHaveBeenCalled();
    });
});