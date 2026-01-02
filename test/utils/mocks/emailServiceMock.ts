export function buildMockEmailService(options?: { code?: string }) {
  const code = options?.code ?? "123456";

  return jest.fn().mockImplementation(() => ({
    generateVerificationCode: jest.fn(() => code),
    getVerificationCodeExpiry: jest.fn(() => {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 30);
      return expiry;
    }),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    validateEmailQuality: jest.fn(() => ({ valid: true })),
  }));
}
