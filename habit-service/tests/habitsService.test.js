import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Helper to import habitsService and patch supabaseAdmin.from
 * so we don't talk to a real Supabase instance.
 */
async function setupHabitsServiceMock({ habitsRows, statsRows, statsShouldError = false } = {}) {
  // Ensure env vars are present so supabaseAdmin is created
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key'

  // Import the real supabaseAdmin instance and the service under test
  const { supabaseAdmin } = await import('../config/supabaseClient.js')
  const habitsService = await import('../services/habitsService.js')

  // Mock only the "from" method on the existing supabaseAdmin
  mock.method(supabaseAdmin, 'from', (table) => {
    if (table === 'habits') {
      return {
        select() {
          return this
        },
        order() {
          return this
        },
        eq() {
          // When user_id filter is applied, we just return the same rows
          return Promise.resolve({ data: habitsRows, error: null })
        },
      }
    }

    if (table === 'habit_stats') {
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        in() {
          if (statsShouldError) {
            return Promise.resolve({ data: null, error: new Error('stats failed') })
          }
          return Promise.resolve({ data: statsRows, error: null })
        },
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { habitsService }
}

test('listHabits returns merged habits with stats for a user', async () => {
  const habitsRows = [
    { id: 1, name: 'Exercise', description: 'Run 5km', created_at: '2025-01-01' },
    { id: 2, name: 'Read', description: 'Read 10 pages', created_at: '2025-01-02' },
  ]

  const statsRows = [
    {
      habit_id: 1,
      current_streak: 3,
      longest_streak: 5,
      total_completions: 10,
      last_completed_date: '2025-01-10',
    },
  ]

  const { habitsService } = await setupHabitsServiceMock({
    habitsRows,
    statsRows,
  })

  const result = await habitsService.listHabits('user-123')

  assert.equal(result.length, 2)

  const exercise = result.find((h) => h.id === 1)
  assert.deepEqual(exercise, {
    id: 1,
    name: 'Exercise',
    description: 'Run 5km',
    created_at: '2025-01-01',
    current_streak: 3,
    longest_streak: 5,
    total_completions: 10,
    last_completed_date: '2025-01-10',
  })

  const read = result.find((h) => h.id === 2)
  assert.deepEqual(read, {
    id: 2,
    name: 'Read',
    description: 'Read 10 pages',
    created_at: '2025-01-02',
    current_streak: 0,
    longest_streak: 0,
    total_completions: 0,
    last_completed_date: null,
  })
})

test('listHabits degrades gracefully when stats query fails', async () => {
  const habitsRows = [
    { id: 1, name: 'Exercise', description: 'Run 5km', created_at: '2025-01-01' },
  ]

  const { habitsService } = await setupHabitsServiceMock({
    habitsRows,
    statsRows: null,
    statsShouldError: true,
  })

  const result = await habitsService.listHabits('user-123')

  // When stats lookup fails, we should still return the base habits without throwing
  assert.deepEqual(result, habitsRows)
})


