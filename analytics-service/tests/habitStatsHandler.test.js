import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// REQ7: Failure Test Cases for analytics-service
// At least 2 endpoint/component failure test cases
// ============================================================================

/**
 * Mock Supabase client for testing without real database connection.
 * We test the message parsing and validation logic, not the database operations.
 */

// Set required env vars before importing the handler
process.env.SUPABASE_URL = 'https://example.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key'

// Since the handler imports Supabase at module level, we need to test
// the validation logic that happens before any database calls

test('handleHabitCompleted ignores event with missing userId', async (t) => {
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

test('handleHabitCompleted ignores event with missing habitId', async (t) => {
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

test('handleHabitCompleted ignores event with missing date', async (t) => {
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

test('handleHabitCompleted handles completely empty event gracefully', async (t) => {
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

