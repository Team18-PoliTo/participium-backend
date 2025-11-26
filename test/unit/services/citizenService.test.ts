// test/unit/services/citizenService.test.ts
// --- Mock bcrypt and jwt BEFORE importing the service ---
jest.mock('bcrypt', () => ({
    __esModule: true,
    hash: jest.fn(async () => 'hashed-pass'),
    compare: jest.fn(async () => true),
    default: {
        hash: jest.fn(async () => 'hashed-pass'),
        compare: jest.fn(async () => true),
    },
}));

jest.mock('jsonwebtoken', () => {
    const sign = jest.fn(() => 'token-123');
    return { __esModule: true, default: { sign }, sign };
});

// Mock MinIoService
jest.mock('../../../src/services/MinIoService', () => ({
    __esModule: true,
    default: {
        uploadUserProfilePhoto: jest.fn(),
        deleteFile: jest.fn(),
    },
}));

import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import MinIoService from '../../../src/services/MinIoService';
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
            telegramUsername: u.telegramUsername,
            emailNotificationsEnabled: u.emailNotificationsEnabled,
            accountPhotoUrl: u.accountPhotoUrl,
        }),
    },
}));

import { ICitizenRepository } from '../../../src/repositories/ICitizenRepository';

describe('CitizenService — complete tests', () => {
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
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            update: jest.fn(),
        } as any;

        loadService();
    });

    // ---------- REGISTER TESTS ----------
    describe('register', () => {
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
    });

    // ---------- LOGIN TESTS ----------
    describe('login', () => {
        it('login: success — returns token and DTO, resets failed attempts', async () => {
            repo.findByEmail.mockResolvedValueOnce({
                ...citizenBase,
                failedLoginAttempts: 3,
                password: 'hashed-pass',
            });

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

            (bcrypt as any).compare = jest.fn(async () => false);

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

    // ---------- UPDATE CITIZEN TESTS ----------
    describe('updateCitizen', () => {
        it('should throw when citizen not found', async () => {
            repo.findById.mockResolvedValueOnce(null);

            await expect(
                service.updateCitizen(999, { firstName: 'Test' })
            ).rejects.toThrow('Citizen not found');

            expect(repo.update).not.toHaveBeenCalled();
        });

        it('should update firstName and lastName', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = { ...citizenBase, firstName: 'NewFirst', lastName: 'NewLast' };
            repo.findById.mockResolvedValueOnce(updated);

            const result = await service.updateCitizen(42, {
                firstName: 'NewFirst',
                lastName: 'NewLast',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                firstName: 'NewFirst',
                lastName: 'NewLast',
            });
            expect(result.firstName).toBe('NewFirst');
            expect(result.lastName).toBe('NewLast');
        });

        it('should normalize and lowercase email', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = { ...citizenBase, email: 'newemail@test.com' };
            repo.findById.mockResolvedValueOnce(updated);

            await service.updateCitizen(42, {
                email: 'NewEmail@TEST.COM',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                email: 'newemail@test.com',
            });
        });

        it('should normalize and lowercase username', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = { ...citizenBase, username: 'newusername' };
            repo.findById.mockResolvedValueOnce(updated);

            await service.updateCitizen(42, {
                username: 'NewUserName',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                username: 'newusername',
            });
        });

        it('should set email to null when empty string provided', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce({ ...citizenBase, email: null });

            await service.updateCitizen(42, {
                email: '',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                email: null,
            });
        });

        it('should set username to null when "null" string provided', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce({ ...citizenBase, username: null });

            await service.updateCitizen(42, {
                username: 'null',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                username: null,
            });
        });

        it('should set fields to null when null provided', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce({ ...citizenBase, firstName: null, lastName: null });

            await service.updateCitizen(42, {
                firstName: null,
                lastName: null,
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                firstName: null,
                lastName: null,
            });
        });

        it('should update telegramUsername', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = { ...citizenBase, telegramUsername: '@newhandle' };
            repo.findById.mockResolvedValueOnce(updated);

            await service.updateCitizen(42, {
                telegramUsername: '@newhandle',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                telegramUsername: '@newhandle',
            });
        });

        it('should update emailNotificationsEnabled', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = { ...citizenBase, emailNotificationsEnabled: false };
            repo.findById.mockResolvedValueOnce(updated);

            await service.updateCitizen(42, {
                emailNotificationsEnabled: false,
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                emailNotificationsEnabled: false,
            });
        });

        it('should update accountPhotoUrl given a photo path, deleting old one', async () => {
            // Setup citizen with an existing photo
            const oldPhotoPath = 'photos/old.jpg';
            const newPhotoPath = 'temp/new.jpg';
            
            const citizenWithPhoto = { ...citizenBase, accountPhotoUrl: oldPhotoPath };
            
            repo.findById.mockResolvedValueOnce(citizenWithPhoto);
            const updated = { ...citizenBase, accountPhotoUrl: newPhotoPath };
            repo.findById.mockResolvedValueOnce(updated);

            const result = await service.updateCitizen(42, {
                photoPath: newPhotoPath,
            });

            // Should delete old photo
            expect(MinIoService.deleteFile).toHaveBeenCalledWith('profile-photos', oldPhotoPath);
            
            // Should update with new path
            expect(repo.update).toHaveBeenCalledWith(42, {
                accountPhotoUrl: newPhotoPath,
            });
            expect(result.accountPhotoUrl).toBe(newPhotoPath);
        });

        it('should update multiple fields at once', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            const updated = {
                ...citizenBase,
                firstName: 'Multi',
                lastName: 'Update',
                email: 'multi@test.com',
                telegramUsername: '@multi',
                emailNotificationsEnabled: true,
            };
            repo.findById.mockResolvedValueOnce(updated);

            await service.updateCitizen(42, {
                firstName: 'Multi',
                lastName: 'Update',
                email: 'Multi@Test.COM',
                telegramUsername: '@multi',
                emailNotificationsEnabled: true,
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                firstName: 'Multi',
                lastName: 'Update',
                email: 'multi@test.com',
                telegramUsername: '@multi',
                emailNotificationsEnabled: true,
            });
        });

        it('should not include undefined fields in update payload', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce(citizenBase);

            await service.updateCitizen(42, {
                firstName: 'OnlyThis',
            });

            expect(repo.update).toHaveBeenCalledWith(42, {
                firstName: 'OnlyThis',
            });
            
            // Verify that other fields are not in the payload
            const updateCall = (repo.update as jest.Mock).mock.calls[0][1];
            expect(updateCall).not.toHaveProperty('lastName');
            expect(updateCall).not.toHaveProperty('email');
            expect(updateCall).not.toHaveProperty('username');
        });

        it('should throw if citizen not found after update', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce(null); // After update

            await expect(
                service.updateCitizen(42, { firstName: 'Test' })
            ).rejects.toThrow('Citizen not found after update');
        });

        it('should handle empty update payload', async () => {
            repo.findById.mockResolvedValueOnce(citizenBase);
            repo.findById.mockResolvedValueOnce(citizenBase);

            const result = await service.updateCitizen(42, {});

            expect(repo.update).toHaveBeenCalledWith(42, {});
            expect(result.id).toBe(42);
        });
    });
});