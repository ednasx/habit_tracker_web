import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest' // supertest is a library for testing HTTP requests. It allows you to test your API endpoints as if you were a user.
import { generateTestToken, setupTestAuth } from './testHelpers.js'

// Set up test JWT secret before importing app
setupTestAuth()

// Import app after setting up test auth
const { default: app } = await import('../index.js')

// ============================================================================
// REQ7: Failure Test Cases for user-service
// At least 2 endpoint failure test cases (unauthorized access, validation errors)
// ============================================================================

// --- Unauthorized Access Tests (401) ---
// These tests act as a 'security net'. If a developer accidentally removes the
// authentication middleware, these tests will fail immediately, preventing a
// security breach before the code goes live.

test('GET /api/users/profile returns 401 without Authorization header', async () => {
  const res = await request(app).get('/api/users/profile')
  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('GET /api/users/friends returns 401 without Authorization header', async () => {
  const res = await request(app).get('/api/users/friends')
  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('GET /api/users/search returns 401 without Authorization header', async () => {
  const res = await request(app).get('/api/users/search?q=test')
  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('POST /api/users/friends/:friendId/accept returns 401 without auth', async () => {
  const res = await request(app)
    .post('/api/users/friends/invalid-uuid/accept')
    .send({})

  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('DELETE /api/users/friends/:friendId returns 401 without auth', async () => {
  const res = await request(app)
    .delete('/api/users/friends/some-friend-id')

  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

// --- Validation Error Tests (400) ---
// These tests use a valid JWT token to bypass authentication and test
// validation logic directly.

test('POST /api/users/profile returns 400 when username is missing', async () => {
  const token = generateTestToken()

  const res = await request(app)
    .post('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({})

  assert.equal(res.status, 400, `Expected 400 for missing username, got ${res.status}`)
})

test('GET /api/users/search returns 400 when query parameter q is missing', async () => {
  const token = generateTestToken()

  const res = await request(app)
    .get('/api/users/search')
    .set('Authorization', `Bearer ${token}`)
    // No q parameter provided

  assert.equal(res.status, 400, `Expected 400 for missing query parameter, got ${res.status}`)
})

test('POST /api/users/friends/request returns 400 when username is missing in body', async () => {
  const token = generateTestToken()

  const res = await request(app)
    .post('/api/users/friends/request')
    .set('Authorization', `Bearer ${token}`)
    .send({})

  assert.equal(res.status, 400, `Expected 400 for missing username in body, got ${res.status}`)
})
