// analytics-service/handlers/habitStatsHandler.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('[Analytics] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/**
 * Handles habit.completed events by updating habit_stats table.
 * Only the first completion per (user, habit, date) should affect totals & streaks.
 *
 * @param {Object} event
 * @param {string} event.userId
 * @param {number} event.habitId
 * @param {string} event.date - YYYY-MM-DD
 */
export async function handleHabitCompleted(event) {
  const { userId, habitId, date } = event
  if (!userId || !habitId || !date) {
    console.warn('[Analytics] Ignoring invalid habit.completed event payload:', event)
    return
  }

  const eventDate = new Date(date) // expecting YYYY-MM-DD
  const eventDateStr = date

  // 1. Get existing stats row
  const { data: stats, error: statsError } = await supabaseAdmin
    .from('habit_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .maybeSingle()

  if (statsError) {
    console.error('[Analytics] Error fetching stats:', statsError.message)
    return
  }

  let total
  let currentStreak
  let longestStreak
  let lastDate = stats?.last_completed_date || null

  if (!stats) {
    // First-ever completion for this habit/user
    total = 1
    currentStreak = 1
    longestStreak = 1
    lastDate = eventDateStr
  } else {
    // Start from existing values
    total = stats.total_completions || 0
    currentStreak = stats.current_streak || 0
    longestStreak = stats.longest_streak || 0

    const prevDateStr = stats.last_completed_date

    if (prevDateStr) {
      const prevDate = new Date(prevDateStr + 'T00:00:00Z')
      const diffDays =
        (eventDate - prevDate) / (1000 * 60 * 60 * 24)

      if (diffDays === 0) {
        // Same calendar day as last completion:
        // -> treat as duplicate click: DO NOT increment total or streaks
        console.log(
          `[Analytics] Ignoring duplicate completion for same day: user=${userId}, habit=${habitId}, date=${eventDateStr}`
        )
        // keep existing totals & streaks, keep lastDate as prevDateStr
        lastDate = prevDateStr
      } else {
        // New day: this completion should count
        total = total + 1

        if (diffDays === 1) {
          // Consecutive day -> increase streak
          currentStreak = (currentStreak || 0) + 1
        } else {
          // Gap -> reset streak
          currentStreak = 1
        }

        longestStreak = Math.max(longestStreak || 0, currentStreak)
        lastDate = eventDateStr
      }
    } else {
      // Stats row exists but no last_completed_date (edge case)
      total = total + 1
      currentStreak = 1
      longestStreak = Math.max(longestStreak || 0, 1)
      lastDate = eventDateStr
    }
  }

  // 2. Upsert stats row
  const { error: upsertError } = await supabaseAdmin
    .from('habit_stats')
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        total_completions: total,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_completed_date: lastDate,
      },
      { onConflict: 'habit_id,user_id' }
    )

  if (upsertError) {
    console.error('[Analytics] Error upserting stats:', upsertError.message)
  } else {
    console.log(
      `[Analytics] Updated stats: user=${userId}, habit=${habitId}, total=${total}, currentStreak=${currentStreak}, longestStreak=${longestStreak}`
    )
  }
}
