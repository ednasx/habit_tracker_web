import { supabaseAdmin } from '../config/supabaseClient.js'

function ensureSupabaseConfigured() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }
}

/**
 * Recompute stats (total_completions, current_streak, longest_streak, last_completed_date)
 * for a given (user, habit) pair based on habit_logs.
 *
 * This is called after every logHabitCompletion.
 */
async function recomputeHabitStats({ userId, habitId }) {
  ensureSupabaseConfigured()

  // Get all log dates for this habit/user
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('habit_logs')
    .select('date')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .order('date', { ascending: true })

  if (logsError) {
    throw new Error(`Supabase recomputeHabitStats logs error: ${logsError.message}`)
  }

  const dates = (logs ?? [])
    .map((row) => row.date)
    .filter(Boolean)

  // If there are no logs, reset stats for this habit
  if (dates.length === 0) {
    const { error: upsertError } = await supabaseAdmin
      .from('habit_stats')
      .upsert(
        [
          {
            habit_id: habitId,
            user_id: userId,
            total_completions: 0,
            current_streak: 0,
            longest_streak: 0,
            last_completed_date: null,
          },
        ],
        { onConflict: 'habit_id,user_id' }
      )

    if (upsertError) {
      throw new Error(`Supabase recomputeHabitStats upsert error: ${upsertError.message}`)
    }

    return
  }

  // Helper: convert YYYY-MM-DD to a day number (UTC) for easy diff
  const toDayNumber = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00Z`)
    return Math.floor(d.getTime() / 86400000)
  }

  const uniqueDates = dates // already sorted ascending and unique due to (habit_id,date) upsert
  const totalCompletions = uniqueDates.length
  const lastCompletedDate = uniqueDates[uniqueDates.length - 1]

  // Compute longest_streak and current_streak (streak ending at lastCompletedDate)
  let longestStreak = 0
  let currentStreak = 0

  let streak = 0
  let prevDayNum = null

  for (const ds of uniqueDates) {
    const dayNum = toDayNumber(ds)

    if (prevDayNum === null) {
      streak = 1
    } else if (dayNum === prevDayNum + 1) {
      // consecutive day continues streak
      streak += 1
    } else if (dayNum === prevDayNum) {
      // same day (should not happen with upsert constraint), ignore
    } else {
      // break in streak, start new streak
      streak = 1
    }

    if (streak > longestStreak) {
      longestStreak = streak
    }

    prevDayNum = dayNum
  }

  // At the end of the loop, `streak` is the streak ending at the last date
  currentStreak = streak

  const { error: upsertError } = await supabaseAdmin
    .from('habit_stats')
    .upsert(
      [
        {
          habit_id: habitId,
          user_id: userId,
          total_completions: totalCompletions,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_completed_date: lastCompletedDate,
        },
      ],
      { onConflict: 'habit_id,user_id' }
    )

  if (upsertError) {
    throw new Error(`Supabase recomputeHabitStats upsert error: ${upsertError.message}`)
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
 * After logging, recompute stats in habit_stats.
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

  // Recompute streaks and other stats for this habit
  await recomputeHabitStats({ userId, habitId })

  return data
}
