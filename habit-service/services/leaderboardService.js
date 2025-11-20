import { supabaseAdmin } from '../config/supabaseClient.js'

function ensureSupabaseConfigured() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }
}

export async function getFriendsLeaderboard(userId, limit = 10) {
  ensureSupabaseConfigured()

  // get friend ids
  const { data: friends, error: friendsError } = await supabaseAdmin
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId)

  if (friendsError) {
    throw new Error(`Supabase friends error: ${friendsError.message}`)
  }

  const friendIds = friends.map((f) => f.friend_id)
  if (friendIds.length === 0) return []

  // aggregate stats for friends
  const { data, error } = await supabaseAdmin
    .from('habit_stats')
    .select('user_id, total_completions')
    .in('user_id', friendIds)
    .order('total_completions', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Supabase leaderboard error: ${error.message}`)
  }

  return data
}
