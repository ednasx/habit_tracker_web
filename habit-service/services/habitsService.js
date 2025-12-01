import { supabaseAdmin } from '../config/supabaseClient.js'

function ensureSupabaseConfigured() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }
}

export async function listHabits(userId) {
  ensureSupabaseConfigured()

  let query = supabaseAdmin
    .from('habits')
    .select('id, name, description, created_at')
    .order('id', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: habits, error } = await query

  if (error) {
    throw new Error(`Supabase listHabits error: ${error.message}`)
  }

  const safeHabits = habits ?? []

  // If no user or no habits, just return the base list
  if (!userId || safeHabits.length === 0) {
    return safeHabits
  }

  // Fetch stats for all these habits in one query
  const habitIds = safeHabits.map((h) => h.id)

  const { data: stats, error: statsError } = await supabaseAdmin
    .from('habit_stats')
    .select('habit_id, current_streak, longest_streak, total_completions, last_completed_date')
    .eq('user_id', userId)
    .in('habit_id', habitIds)

  if (statsError) {
    console.error('Supabase listHabits stats error:', statsError.message)
    // Degrade gracefully: return habits without stats instead of failing the whole request
    return safeHabits
  }

  const statsMap = new Map()
  for (const row of stats ?? []) {
    statsMap.set(row.habit_id, row)
  }

  // Merge stats into each habit
  return safeHabits.map((habit) => {
    const s = statsMap.get(habit.id)
    return {
      ...habit,
      current_streak: s?.current_streak ?? 0,
      longest_streak: s?.longest_streak ?? 0,
      total_completions: s?.total_completions ?? 0,
      last_completed_date: s?.last_completed_date ?? null,
    }
  })
}

export async function createHabit({ userId, name, description }) {
  ensureSupabaseConfigured()

  const { data, error } = await supabaseAdmin
    .from('habits')
    .insert([
      {
        user_id: userId,
        name,
        description,
      },
    ])
    .select('id, user_id, name, description, created_at')
    .single()

  if (error) {
    throw new Error(`Supabase createHabit error: ${error.message}`)
  }

  // Newly created habit has 0 stats initially; we don't create a habit_stats row yet.
  return data
}

export async function getHabitById({ userId, habitId }) {
  ensureSupabaseConfigured()

  const { data: habit, error } = await supabaseAdmin
    .from('habits')
    .select('id, user_id, name, description, created_at')
    .eq('id', habitId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows
      return null
    }
    throw new Error(`Supabase getHabitById error: ${error.message}`)
  }

  if (!habit) {
    return null
  }

  // Attach stats for this single habit
  const { data: stats, error: statsError } = await supabaseAdmin
    .from('habit_stats')
    .select('current_streak, longest_streak, total_completions, last_completed_date')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .maybeSingle()

  if (statsError) {
    console.error('Supabase getHabitById stats error:', statsError.message)
    return habit
  }

  return {
    ...habit,
    current_streak: stats?.current_streak ?? 0,
    longest_streak: stats?.longest_streak ?? 0,
    total_completions: stats?.total_completions ?? 0,
    last_completed_date: stats?.last_completed_date ?? null,
  }
}

export async function updateHabit({ userId, habitId, name, description }) {
  ensureSupabaseConfigured()

  const { data, error } = await supabaseAdmin
    .from('habits')
    .update({
      name,
      description,
    })
    .eq('id', habitId)
    .eq('user_id', userId)
    .select('id, user_id, name, description, created_at')
    .single()

  if (error) {
    throw new Error(`Supabase updateHabit error: ${error.message}`)
  }

  return data
}

export async function deleteHabit({ userId, habitId }) {
  ensureSupabaseConfigured()

  const { data, error } = await supabaseAdmin
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Supabase deleteHabit error: ${error.message}`)
  }

  // habit_stats and habit_logs are deleted via ON DELETE CASCADE from DB
  return data
}

/**
 * Log a habit completion for a given date.
 * If an entry already exists for (habit_id, date), upsert ensures it is updated.
 * 
 * Stats (streaks, totals) are computed asynchronously by analytics-service
 * after consuming the habit.completed RabbitMQ event published by the route handler.
 * This maintains proper microservices separation of concerns.
 */
export async function logHabitCompletion({ userId, habitId, date, value = 1 }) {
  ensureSupabaseConfigured()

  // upsert on (habit_id, date)
  const { data, error } = await supabaseAdmin
    .from('habit_logs')
    .upsert(
      [
        {
          user_id: userId,
          habit_id: habitId,
          date,
          value,
        },
      ],
      {
        onConflict: 'habit_id,date',
      }
    )
    .select('id, habit_id, user_id, date, value, created_at')
    .single()

  if (error) {
    throw new Error(`Supabase logHabitCompletion error: ${error.message}`)
  }

  // Stats are computed asynchronously by analytics-service via RabbitMQ events
  // No synchronous recomputation here to maintain microservices architecture

  return data
}
