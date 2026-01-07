import jwt from 'jsonwebtoken'

// Use a consistent test secret for all tests
export const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only'

/**
 * Generates a valid JWT token for testing purposes
 * @param {string} userId - The user ID to include in the token (default: test user)
 * @param {object} additionalClaims - Any additional claims to add to the token
 * @returns {string} A valid JWT token
 */
export function generateTestToken(userId = '123e4567-e89b-12d3-a456-426614174000', additionalClaims = {}) {
  const payload = {
    sub: userId, // Supabase puts user ID in 'sub'
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    ...additionalClaims,
  }

  return jwt.sign(payload, TEST_JWT_SECRET)
}

/**
 * Sets up the test environment with a JWT secret
 * Call this at the top of your test file or in a setup function
 */
export function setupTestAuth() {
  if (!process.env.SUPABASE_JWT_SECRET) {
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  }
}

