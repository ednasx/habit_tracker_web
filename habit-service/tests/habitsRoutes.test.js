import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { generateTestToken, setupTestAuth } from './testHelpers.js'

// Set up test JWT secret before importing app
setupTestAuth()

// Import app after setting up test auth
const { default: app } = await import('../index.js')

test('GET /api/habits returns 401 without Authorization header', async () => {
  const res = await request(app).get('/api/habits')
  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('POST /api/habits returns 400 when name is missing', async () => {
  const token = generateTestToken()

  const res = await request(app)
    .post('/api/habits')
    .set('Authorization', `Bearer ${token}`)
    .send({})

  assert.equal(res.status, 400, `Expected 400 for missing name, got ${res.status}`)
  assert.ok(res.body.message.includes('name is required'), 'Error message should mention name is required')
})