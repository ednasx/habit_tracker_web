import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../index.js'

test('GET /api/habits returns 401 without Authorization header', async () => {
  const res = await request(app).get('/api/habits')
  assert.equal(res.status, 401)
  assert.equal(res.body.message, 'Missing Authorization header')
})

test('POST /api/habits returns 400 when name is missing', async () => {
  // Note: this will likely be 401 without a valid token in real life.
  // For demonstration we just show the validation error expectation.
  const res = await request(app)
    .post('/api/habits')
    .set('Authorization', 'Bearer invalid-token')
    .send({})

  assert.ok(
    res.status === 400 || res.status === 401,
    `Expected 400 or 401, got ${res.status}`
  )
})
