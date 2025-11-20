import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireAuth } from '../auth/authMiddleware.js'

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

test('requireAuth returns 401 if Authorization header is missing', async () => {
  const req = { headers: {} }
  const res = createMockRes()
  let nextCalled = false
  const next = () => {
    nextCalled = true
  }

  await requireAuth(req, res, next)

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
  assert.deepEqual(res.body, { message: 'Missing Authorization header' })
})

test('requireAuth returns 401 if Authorization header is malformed', async () => {
  const req = { headers: { authorization: 'Token something' } }
  const res = createMockRes()
  let nextCalled = false

  await requireAuth(req, res, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
  assert.deepEqual(res.body, { message: 'Invalid Authorization header format' })
})
