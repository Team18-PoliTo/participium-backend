import { CitizenMapper } from '../../../src/mappers/CitizenMapper';
import { InternalUserMapper } from '../../../src/mappers/InternalUserMapper';

describe('mappers', () => {
  it('CitizenMapper defaults status to ACTIVE when missing', () => {
    const createdAt = new Date();
    const dto = CitizenMapper.toDTO({
      id: 1,
      email: 'c@city.com',
      username: 'citizen',
      firstName: 'City',
      lastName: 'Zen',
      createdAt,
    } as any);

    expect(dto.status).toBe('ACTIVE');
    expect(dto).toMatchObject({
      id: 1,
      email: 'c@city.com',
      username: 'citizen',
    });
  });

  it('InternalUserMapper returns role name when available', () => {
    const createdAt = new Date();
    const dto = InternalUserMapper.toDTO({
      id: 2,
      email: 'admin@city.com',
      firstName: 'Admin',
      lastName: 'User',
      createdAt,
      role: { role: 'ADMIN' },
      status: 'ACTIVE',
    } as any);

    expect(dto.role).toBe('ADMIN');
  });

  it('InternalUserMapper falls back to role id when name missing', () => {
    const dto = InternalUserMapper.toDTO({
      id: 3,
      email: 'staff@city.com',
      firstName: 'Staff',
      lastName: 'Member',
      createdAt: new Date(),
      role: { id: 7 },
    } as any);

    expect(dto.role).toBe(7);
    expect(dto.status).toBe('ACTIVE');
  });

  it('InternalUserMapper defaults role to 0 when role object missing entirely', () => {
    const dto = InternalUserMapper.toDTO({
      id: 4,
      email: 'norole@city.com',
      firstName: 'No',
      lastName: 'Role',
      createdAt: new Date(),
    } as any);

    expect(dto.role).toBe(0);
  });
});
