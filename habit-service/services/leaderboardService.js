// habit-service/services/leaderboardService.js
import { supabaseAdmin } from '../config/supabaseClient.js';

function ensureSupabaseConfigured() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }
}

/**
 * Build a friends + self leaderboard.
 *
 * Ranking metric:
 *  - Primary: total_completions (sum across all habits)
 *  - Secondary: longest_streak (max across all habits)
 */
export async function getFriendsLeaderboard(userId, limit = 10) {
  ensureSupabaseConfigured();

  // 1) Find accepted friendships involving this user
  const { data: friendRows, error: friendsError } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (friendsError) {
    throw new Error(`Supabase friends error: ${friendsError.message}`);
  }

  // 2) Extract friend IDs in a set (avoid duplicates)
  const friendIdSet = new Set();

  for (const row of friendRows || []) {
    const friendId = row.user_id === userId ? row.friend_id : row.user_id;
    friendIdSet.add(friendId);
  }

  // Always include the current user as well
  friendIdSet.add(userId);

  const userIds = Array.from(friendIdSet);
  if (userIds.length === 0) {
    return [];
  }

  // 3) Fetch habit_stats for these users
  const { data: statsRows, error: statsError } = await supabaseAdmin
    .from('habit_stats')
    .select('user_id, total_completions, current_streak, longest_streak')
    .in('user_id', userIds);

  if (statsError) {
    throw new Error(`Supabase habit_stats error: ${statsError.message}`);
  }

  // 4) Aggregate per user in Node (sum completions, max streaks)
  const perUser = new Map();

  for (const row of statsRows || []) {
    const uid = row.user_id;
    if (!perUser.has(uid)) {
      perUser.set(uid, {
        user_id: uid,
        total_completions: 0,
        current_streak: 0,
        longest_streak: 0,
      });
    }

    const entry = perUser.get(uid);
    entry.total_completions += row.total_completions || 0;
    entry.current_streak = Math.max(
      entry.current_streak,
      row.current_streak || 0
    );
    entry.longest_streak = Math.max(
      entry.longest_streak,
      row.longest_streak || 0
    );
  }

  // Users with no stats at all should still show up (0 completions)
  for (const uid of userIds) {
    if (!perUser.has(uid)) {
      perUser.set(uid, {
        user_id: uid,
        total_completions: 0,
        current_streak: 0,
        longest_streak: 0,
      });
    }
  }

  // 5) Fetch profile info (username, display_name)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, username, display_name')
    .in('user_id', userIds);

  if (profilesError) {
    throw new Error(`Supabase user_profiles error: ${profilesError.message}`);
  }

  const profileById = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  // 6) Build final leaderboard array
  let leaderboard = Array.from(perUser.values()).map((entry) => {
    const profile = profileById.get(entry.user_id) || {};
    return {
      user_id: entry.user_id,
      total_completions: entry.total_completions,
      current_streak: entry.current_streak,
      longest_streak: entry.longest_streak,
      username: profile.username || null,
      display_name: profile.display_name || null,
      is_self: entry.user_id === userId,
    };
  });

  // 7) Sort & rank
  leaderboard.sort((a, b) => {
    if (b.total_completions !== a.total_completions) {
      return b.total_completions - a.total_completions;
    }
    return (b.longest_streak || 0) - (a.longest_streak || 0);
  });

  leaderboard = leaderboard.slice(0, limit).map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));

  return leaderboard;
}
