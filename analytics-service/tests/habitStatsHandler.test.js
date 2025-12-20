import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// REQ7: Failure Test Cases for analytics-service
// - Validation-only tests (existing)
// - Stats calculation + error handling tests (new)
// ============================================================================

// Set required env vars before importing the handler
process.env.SUPABASE_URL = 'https://example.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key'

/**
 * Helper to mock Supabase habit_stats interactions for stats calculation tests.
 * We focus on handleHabitCompleted logic, not real database behavior.
 */
async function setupStatsMock({
  existingStats = null,
  statsFetchError = null,
  upsertError = null,
} = {}) {
  // Import after env vars are set so handler initializes correctly
  const { handleHabitCompleted, supabaseAdmin } = await import('../handlers/habitStatsHandler.js')

  // Ensure we start from a clean mock state
  mock.restoreAll()

  // Capture upsert payloads for assertions
  const upsertCalls = []

  // Mock only the habit_stats table interactions
  mock.method(supabaseAdmin, 'from', (table) => {
    if (table !== 'habit_stats') {
      throw new Error(`Unexpected table: ${table}`)
    }

    return {
      // For stats fetch: select().eq().eq().maybeSingle()
      select() {
        return this
      },
      eq() {
        return this
      },
      maybeSingle() {
        if (statsFetchError) {
          return Promise.resolve({ data: null, error: statsFetchError })
        }
        return Promise.resolve({ data: existingStats, error: null })
      },

      // For upsert: upsert(payload, options)
      upsert(payload /*, options */) {
        upsertCalls.push(payload)
        if (upsertError) {
          return Promise.resolve({ error: upsertError })
        }
        return Promise.resolve({ error: null })
      },
    }
  })

  return { handleHabitCompleted, upsertCalls }
}

// ============================================================================
// Validation tests (existing) – ensure invalid events are ignored
// ============================================================================

test('handleHabitCompleted ignores event with missing userId', async () => {
  // Dynamically import after setting env vars
  const { handleHabitCompleted } = await import('../handlers/habitStatsHandler.js')
  
  // Mock console.warn to verify warning is logged
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  
  try {
    // Event missing userId - should be ignored
    await handleHabitCompleted({
      habitId: 123,
      date: '2025-01-15'
      // userId is missing
    })
    
    // Verify warning was logged about invalid payload
    assert.ok(
      warnings.some(w => w.includes('Ignoring invalid')),
      'Should log warning for invalid event payload'
    )
  } finally {
    console.warn = originalWarn
  }
})

test('handleHabitCompleted ignores event with missing habitId', async () => {
  const { handleHabitCompleted } = await import('../handlers/habitStatsHandler.js')
  
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  
  try {
    // Event missing habitId - should be ignored
    await handleHabitCompleted({
      userId: 'user-123',
      date: '2025-01-15'
      // habitId is missing
    })
    
    assert.ok(
      warnings.some(w => w.includes('Ignoring invalid')),
      'Should log warning for invalid event payload'
    )
  } finally {
    console.warn = originalWarn
  }
})

test('handleHabitCompleted ignores event with missing date', async () => {
  const { handleHabitCompleted } = await import('../handlers/habitStatsHandler.js')
  
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  
  try {
    // Event missing date - should be ignored
    await handleHabitCompleted({
      userId: 'user-123',
      habitId: 123
      // date is missing
    })
    
    assert.ok(
      warnings.some(w => w.includes('Ignoring invalid')),
      'Should log warning for invalid event payload'
    )
  } finally {
    console.warn = originalWarn
  }
})

test('handleHabitCompleted handles completely empty event gracefully', async () => {
  const { handleHabitCompleted } = await import('../handlers/habitStatsHandler.js')
  
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))
  
  try {
    // Empty event - should be ignored without throwing
    await handleHabitCompleted({})
    
    assert.ok(
      warnings.some(w => w.includes('Ignoring invalid')),
      'Should log warning for empty event payload'
    )
  } finally {
    console.warn = originalWarn
  }
})

// ============================================================================
// Stats calculation – happy path
// ============================================================================

test('handleHabitCompleted creates base stats for first completion', async () => {
  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats: null,
  })

  await handleHabitCompleted({
    userId: 'user-123',
    habitId: 1,
    date: '2025-01-10',
  })

  assert.equal(upsertCalls.length, 1)
  const payload = upsertCalls[0]
  assert.equal(payload.user_id, 'user-123')
  assert.equal(payload.habit_id, 1)
  assert.equal(payload.total_completions, 1)
  assert.equal(payload.current_streak, 1)
  assert.equal(payload.longest_streak, 1)
  assert.equal(payload.last_completed_date, '2025-01-10')
})

test('handleHabitCompleted increments streak on consecutive day', async () => {
  const existingStats = {
    user_id: 'user-123',
    habit_id: 1,
    total_completions: 1,
    current_streak: 1,
    longest_streak: 1,
    last_completed_date: '2025-01-10',
  }

  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats,
  })

  await handleHabitCompleted({
    userId: 'user-123',
    habitId: 1,
    date: '2025-01-11',
  })

  assert.equal(upsertCalls.length, 1)
  const payload = upsertCalls[0]
  assert.equal(payload.total_completions, 2)
  assert.equal(payload.current_streak, 2)
  assert.equal(payload.longest_streak, 2)
  assert.equal(payload.last_completed_date, '2025-01-11')
})

test('handleHabitCompleted resets streak after gap but keeps longest streak', async () => {
  const existingStats = {
    user_id: 'user-123',
    habit_id: 1,
    total_completions: 3,
    current_streak: 3,
    longest_streak: 3,
    last_completed_date: '2025-01-10',
  }

  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats,
  })

  await handleHabitCompleted({
    userId: 'user-123',
    habitId: 1,
    date: '2025-01-13', // gap of 3 days
  })

  assert.equal(upsertCalls.length, 1)
  const payload = upsertCalls[0]
  assert.equal(payload.total_completions, 4)
  assert.equal(payload.current_streak, 1)
  assert.equal(payload.longest_streak, 3)
  assert.equal(payload.last_completed_date, '2025-01-13')
})

test('handleHabitCompleted ignores same-day duplicate completion', async () => {
  const existingStats = {
    user_id: 'user-123',
    habit_id: 1,
    total_completions: 5,
    current_streak: 2,
    longest_streak: 3,
    last_completed_date: '2025-01-10',
  }

  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats,
  })

  await handleHabitCompleted({
    userId: 'user-123',
    habitId: 1,
    date: '2025-01-10',
  })

  assert.equal(upsertCalls.length, 1)
  const payload = upsertCalls[0]
  assert.equal(payload.total_completions, 5)
  assert.equal(payload.current_streak, 2)
  assert.equal(payload.longest_streak, 3)
  assert.equal(payload.last_completed_date, '2025-01-10')
})

// ============================================================================
// Stats calculation – edge cases
// ============================================================================

test('handleHabitCompleted handles existing stats with no last_completed_date', async () => {
  const existingStats = {
    user_id: 'user-123',
    habit_id: 1,
    total_completions: 7,
    current_streak: 0,
    longest_streak: 5,
    last_completed_date: null,
  }

  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats,
  })

  await handleHabitCompleted({
    userId: 'user-123',
    habitId: 1,
    date: '2025-01-20',
  })

  assert.equal(upsertCalls.length, 1)
  const payload = upsertCalls[0]
  assert.equal(payload.total_completions, 8)
  assert.equal(payload.current_streak, 1)
  assert.ok(payload.longest_streak >= 5)
  assert.equal(payload.last_completed_date, '2025-01-20')
})

// ============================================================================
// Stats calculation – error handling
// ============================================================================

test('handleHabitCompleted logs and returns when stats fetch fails', async () => {
  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    statsFetchError: new Error('fetch failed'),
  })

  const errors = []
  const originalError = console.error
  console.error = (...args) => errors.push(args.join(' '))

  try {
    await handleHabitCompleted({
      userId: 'user-123',
      habitId: 1,
      date: '2025-01-10',
    })

    assert.equal(upsertCalls.length, 0)
    assert.ok(
      errors.some((msg) => msg.includes('Error fetching stats')),
      'Expected error log for stats fetch failure',
    )
  } finally {
    console.error = originalError
  }
})

test('handleHabitCompleted logs upsert error but does not throw', async () => {
  const existingStats = {
    user_id: 'user-123',
    habit_id: 1,
    total_completions: 1,
    current_streak: 1,
    longest_streak: 1,
    last_completed_date: '2025-01-10',
  }

  const { handleHabitCompleted, upsertCalls } = await setupStatsMock({
    existingStats,
    upsertError: new Error('upsert failed'),
  })

  const errors = []
  const originalError = console.error
  console.error = (...args) => errors.push(args.join(' '))

  try {
    await handleHabitCompleted({
      userId: 'user-123',
      habitId: 1,
      date: '2025-01-11',
    })

    assert.equal(upsertCalls.length, 1)
    assert.ok(
      errors.some((msg) => msg.includes('Error upserting stats')),
      'Expected error log for upsert failure',
    )
  } finally {
    console.error = originalError
  }
})

