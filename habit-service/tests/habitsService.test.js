import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Helper to import habitsService and patch supabaseAdmin.from
 * so we don't talk to a real Supabase instance.
 */
async function setupHabitsServiceMock({
  habitsRows,
  statsRows,
  statsShouldError = false,
  habitsShouldError = false,
  createHabitShouldError = false,
  getHabitByIdShouldReturnNull = false,
  getHabitByIdShouldError = false,
  getHabitByIdHabit = null,
  getHabitByIdStatsShouldError = false,
  updateHabitShouldError = false,
  deleteHabitShouldError = false,
  logHabitCompletionShouldError = false,
} = {}) {
  // Ensure env vars are present so supabaseAdmin is created
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key'

  // Import the real supabaseAdmin instance and the service under test
  const { supabaseAdmin } = await import('../config/supabaseClient.js')
  const habitsService = await import('../services/habitsService.js')

  // Mock only the "from" method on the existing supabaseAdmin
  mock.method(supabaseAdmin, 'from', (table) => {
    if (table === 'habits') {
      // Track query state per instance
      let isSelectQuery = false
      let firstEqField = null

      return {
        select() {
          isSelectQuery = true
          return this
        },
        order() {
          return this
        },
        eq(field, value) {
          // For listHabits: .select().order().eq('user_id') - returns Promise directly
          if (isSelectQuery && field === 'user_id' && firstEqField === null) {
            if (habitsShouldError) {
              return Promise.resolve({
                data: null,
                error: new Error('Database connection failed'),
              })
            }
            return Promise.resolve({ data: habitsRows || [], error: null })
          }
          // For getHabitById: .select().eq('id').eq('user_id').single()
          if (isSelectQuery && field === 'id') {
            firstEqField = 'id'
            return {
              eq(field2, value2) {
                // Second eq('user_id')
                if (getHabitByIdShouldReturnNull) {
                  return {
                    single() {
                      return Promise.resolve({
                        data: null,
                        error: { code: 'PGRST116', message: 'No rows found' },
                      })
                    },
                  }
                }
                if (getHabitByIdShouldError) {
                  return {
                    single() {
                      return Promise.resolve({
                        data: null,
                        error: new Error('Database query failed'),
                      })
                    },
                  }
                }
                return {
                  single() {
                    const habit = getHabitByIdHabit || {
                      id: 1,
                      user_id: 'user-123',
                      name: 'Test Habit',
                      description: 'Test',
                      created_at: '2025-01-01T00:00:00Z',
                    }
                    return Promise.resolve({
                      data: habit,
                      error: null,
                    })
                  },
                }
              },
            }
          }
          return this
        },
        insert(data) {
          // For createHabit: .insert().select().single()
          if (createHabitShouldError) {
            return {
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Insert failed'),
                })
              },
            }
          }
          return {
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: {
                  id: 1,
                  user_id: data[0].user_id,
                  name: data[0].name,
                  description: data[0].description,
                  created_at: '2025-01-01T00:00:00Z',
                },
                error: null,
              })
            },
          }
        },
        update(data) {
          // For updateHabit: .update().eq().eq().select().single()
          if (updateHabitShouldError) {
            return {
              eq() {
                return this
              },
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Update failed'),
                })
              },
            }
          }
          return {
            eq() {
              return this
            },
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: {
                  id: 1,
                  user_id: 'user-123',
                  name: data.name,
                  description: data.description,
                  created_at: '2025-01-01T00:00:00Z',
                },
                error: null,
              })
            },
          }
        },
        delete() {
          // For deleteHabit: .delete().eq().eq().select().single()
          if (deleteHabitShouldError) {
            return {
              eq() {
                return this
              },
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Delete failed'),
                })
              },
            }
          }
          return {
            eq() {
              return this
            },
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: { id: 1 },
                error: null,
              })
            },
          }
        },
      }
    }

    if (table === 'habit_stats') {
      return {
        select() {
          return this
        },
        eq(field, value) {
          if (field === 'user_id') {
            return {
              eq(field2, value2) {
                // For getHabitById stats: .eq('user_id').eq('habit_id').maybeSingle()
                if (getHabitByIdStatsShouldError) {
                  return {
                    maybeSingle() {
                      return Promise.resolve({
                        data: null,
                        error: new Error('Stats query failed'),
                      })
                    },
                  }
                }
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: {
                        current_streak: 3,
                        longest_streak: 5,
                        total_completions: 10,
                        last_completed_date: '2025-01-10',
                      },
                      error: null,
                    })
                  },
                }
              },
              in(field2, values) {
                // For listHabits stats: .eq('user_id').in('habit_id', [...])
                if (statsShouldError) {
                  return Promise.resolve({
                    data: null,
                    error: new Error('stats failed'),
                  })
                }
                return Promise.resolve({ data: statsRows || [], error: null })
              },
            }
          }
          return this
        },
        in(field, values) {
          if (statsShouldError) {
            return Promise.resolve({
              data: null,
              error: new Error('stats failed'),
            })
          }
          return Promise.resolve({ data: statsRows || [], error: null })
        },
      }
    }

    if (table === 'habit_logs') {
      return {
        upsert(data, options) {
          if (logHabitCompletionShouldError) {
            return {
              select() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: null,
                  error: new Error('Upsert failed'),
                })
              },
            }
          }
          return {
            select() {
              return this
            },
            single() {
              return Promise.resolve({
                data: {
                  id: 1,
                  habit_id: data[0].habit_id,
                  user_id: data[0].user_id,
                  date: data[0].date,
                  value: data[0].value,
                  created_at: '2025-01-15T00:00:00Z',
                },
                error: null,
              })
            },
          }
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

// ============================================================================
// Error Test Cases
// ============================================================================

test('listHabits throws error when habits query fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    habitsRows: null,
    habitsShouldError: true,
  })

  await assert.rejects(
    async () => await habitsService.listHabits('user-123'),
    (err) => {
      assert.ok(err.message.includes('Supabase listHabits error'))
      return true
    }
  )
})

test('listHabits returns empty array when user has no habits', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    habitsRows: [],
    statsRows: [],
  })

  const result = await habitsService.listHabits('user-123')
  assert.equal(result.length, 0)
  assert.deepEqual(result, [])
})

test('createHabit throws error when database insert fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    createHabitShouldError: true,
  })

  await assert.rejects(
    async () =>
      await habitsService.createHabit({
        userId: 'user-123',
        name: 'Test Habit',
        description: 'Test',
      }),
    (err) => {
      assert.ok(err.message.includes('Supabase createHabit error'))
      return true
    }
  )
})

test('getHabitById returns null when habit does not exist', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    getHabitByIdShouldReturnNull: true,
  })

  const result = await habitsService.getHabitById({
    userId: 'user-123',
    habitId: 99999,
  })

  assert.equal(result, null)
})

test('getHabitById throws error when database query fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    getHabitByIdShouldError: true,
  })

  await assert.rejects(
    async () =>
      await habitsService.getHabitById({
        userId: 'user-123',
        habitId: 1,
      }),
    (err) => {
      assert.ok(err.message.includes('Supabase getHabitById error'))
      return true
    }
  )
})

test('getHabitById degrades gracefully when stats query fails', async () => {
  const habitRow = {
    id: 1,
    name: 'Exercise',
    user_id: 'user-123',
    description: 'Run 5km',
    created_at: '2025-01-01T00:00:00Z',
  }

  const { habitsService } = await setupHabitsServiceMock({
    getHabitByIdHabit: habitRow,
    getHabitByIdStatsShouldError: true,
  })

  const result = await habitsService.getHabitById({
    userId: 'user-123',
    habitId: 1,
  })

  // Should return habit without stats fields (not throw) - implementation returns habit as-is on stats error
  assert.deepEqual(result, habitRow)
})

test('updateHabit throws error when database update fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    updateHabitShouldError: true,
  })

  await assert.rejects(
    async () =>
      await habitsService.updateHabit({
        userId: 'user-123',
        habitId: 1,
        name: 'Updated Name',
        description: 'Updated Description',
      }),
    (err) => {
      assert.ok(err.message.includes('Supabase updateHabit error'))
      return true
    }
  )
})

test('deleteHabit throws error when database delete fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    deleteHabitShouldError: true,
  })

  await assert.rejects(
    async () =>
      await habitsService.deleteHabit({
        userId: 'user-123',
        habitId: 1,
      }),
    (err) => {
      assert.ok(err.message.includes('Supabase deleteHabit error'))
      return true
    }
  )
})

test('logHabitCompletion throws error when database upsert fails', async () => {
  const { habitsService } = await setupHabitsServiceMock({
    logHabitCompletionShouldError: true,
  })

  await assert.rejects(
    async () =>
      await habitsService.logHabitCompletion({
        userId: 'user-123',
        habitId: 1,
        date: '2025-01-15',
        value: 1,
      }),
    (err) => {
      assert.ok(err.message.includes('Supabase logHabitCompletion error'))
      return true
    }
  )
})
