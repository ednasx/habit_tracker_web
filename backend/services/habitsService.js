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
