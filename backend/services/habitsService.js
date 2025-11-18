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

  const { data, error } = await query

  if (error) {
    throw new Error(`Supabase listHabits error: ${error.message}`)
  }

  return data ?? []
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

  return data
}

export async function getHabitById({ userId, habitId }) {
  ensureSupabaseConfigured()

  const { data, error } = await supabaseAdmin
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

  return data
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

  return data
}

/**
 * Log a habit completion for a given date.
 * If an entry already exists for (habit_id, date), update its value.
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

  return data
}
