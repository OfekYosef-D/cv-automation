// Mock for jose library used in e2e tests
// The real jose library is ESM-only which Jest has trouble with

export const createRemoteJWKSet = jest.fn(() => {
  // Return a mock JWKS function
  return jest.fn();
});

export const jwtVerify = jest.fn(async (token: string) => {
  // For testing, always reject tokens to simulate auth failure
  // This allows us to test that the auth guard properly rejects invalid tokens
  throw new Error("Mock: Invalid token");
});

export type JWTPayload = Record<string, unknown>;
