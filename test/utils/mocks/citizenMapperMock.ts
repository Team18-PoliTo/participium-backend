export function buildCitizenMapperMock() {
  return {
    CitizenMapper: {
      toDTO: jest.fn(async (u: any) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.status ?? "PENDING",
        isEmailVerified: u.isEmailVerified ?? false,
        createdAt: u.createdAt,
        // Convert null to undefined to match real mapper behavior
        telegramUsername: u.telegramUsername ?? undefined,
        emailNotificationsEnabled: u.emailNotificationsEnabled ?? undefined,
        accountPhoto: u.accountPhotoUrl
          ? `https://presigned-url.com/${u.accountPhotoUrl}`
          : undefined,
        lastLoginAt: u.lastLoginAt ?? undefined,
      })),
    },
  };
}
