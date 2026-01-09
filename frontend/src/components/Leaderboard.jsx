// frontend/src/components/Leaderboard.jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { getFriendsLeaderboard } from '../services/habitsApi'
import { useAuthSession } from '../hooks/useAuthSession'
import { supabase } from '../lib/supabaseClient'

function getInitials(label = '') {
  const parts = label.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function getMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { session } = useAuthSession()
  
  // Use a ref to store friend user IDs so the subscription callback always has the latest list
  const friendUserIdsRef = useRef(new Set())

  // Reusable loader function
  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getFriendsLeaderboard(10)
      const leaderboardEntries = Array.isArray(data) ? data : []
      setEntries(leaderboardEntries)
      
      // Update the ref with current friend IDs (including self)
      friendUserIdsRef.current = new Set(leaderboardEntries.map((e) => e.user_id))
    } catch (err) {
      console.error('[Leaderboard] Error loading leaderboard:', err)
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  // --- Realtime subscription: refresh when habit_stats are updated for any friend ---
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    console.log('[Leaderboard] Setting up real-time subscription for habit_stats updates')

    const leaderboardChannel = supabase
      .channel(`leaderboard-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT (first completion) and UPDATE (subsequent completions)
          schema: 'public',
          table: 'habit_stats',
          // Note: Supabase real-time doesn't support IN filters for multiple user IDs,
          // so we subscribe to all changes and filter in the callback
        },
        async (payload) => {
          const updatedUserId = payload.new?.user_id
          
          // Only refresh if the change is for one of our friends (including self)
          // Use the ref to get the latest friend IDs without recreating the subscription
          if (updatedUserId && friendUserIdsRef.current.has(updatedUserId)) {
            console.log('[Leaderboard] Stats changed for friend:', updatedUserId, payload.eventType, payload.new)
            // Refresh leaderboard to get updated rankings
            await loadLeaderboard()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Leaderboard] habit_stats channel status:', status)
      })

    // Cleanup when session changes or component unmounts
    return () => {
      supabase.removeChannel(leaderboardChannel)
    }
  }, [session, loadLeaderboard])

  if (loading) {
    return (
      <div className="card border-0 shadow-sm mt-4 leaderboard-card">
        <div className="card-body">
          <div className="leaderboard-header mb-3">
            <div>
              <h2 className="h5 mb-1">Friends Leaderboard</h2>
              <p className="text-muted small mb-0">
                Compete with your friends and keep your streak alive.
              </p>
            </div>
            <div className="leaderboard-pill shimmer" />
          </div>

          <div className="leaderboard-skeleton">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="leaderboard-row-skeleton">
                <div className="shimmer rank" />
                <div className="shimmer avatar" />
                <div className="shimmer name" />
                <div className="shimmer stat" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-0 shadow-sm mt-4 leaderboard-card">
        <div className="card-body">
          <div className="leaderboard-header mb-3">
            <div>
              <h2 className="h5 mb-1">Friends Leaderboard</h2>
              <p className="text-muted small mb-0">
                Compete with your friends and keep your streak alive.
              </p>
            </div>
          </div>
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card border-0 shadow-sm mt-4 leaderboard-card">
        <div className="card-body">
          <div className="leaderboard-header mb-3">
            <div>
              <h2 className="h5 mb-1">Friends Leaderboard</h2>
              <p className="text-muted small mb-0">
                Add some friends to start competing on streaks and completions.
              </p>
            </div>
          </div>
          <p className="text-muted mb-0">
            You don&apos;t have any friend stats yet. Send a few friend requests and
            start a friendly competition!
          </p>
        </div>
      </div>
    )
  }

  // Little summary for the header
  const you = entries.find((e) => e.is_self)
  const yourRank = you?.rank
  const yourStreak = you?.current_streak ?? 0

  return (
    <div className="card border-0 shadow-sm mt-4 leaderboard-card">
      <div className="card-body">
        <div className="leaderboard-header mb-3">
          <div>
            <h2 className="h5 mb-1">Friends Leaderboard</h2>
            <p className="text-muted small mb-0">
              Stay consistent and climb the ranks. Every day you show up counts.
            </p>
          </div>
          {you && (
            <div className="leaderboard-pill">
              <span className="label">Your rank</span>
              <span className="value">
                #{yourRank}{' '}
                <span className="sub">
                  • {yourStreak} day
                  {yourStreak === 1 ? '' : 's'} streak
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="leaderboard-list">
          {entries.map((row) => {
            const label =
              row.username ||
              row.display_name ||
              `${row.user_id.slice(0, 8)}…`

            const initials = getInitials(label)
            const medal = getMedal(row.rank)

            return (
              <div
                key={row.user_id}
                className={
                  'leaderboard-row' + (row.is_self ? ' leaderboard-row--self' : '')
                }
              >
                <div className="leaderboard-rank">
                  {medal ? (
                    <span className="leaderboard-medal">{medal}</span>
                  ) : (
                    <span className="leaderboard-rank-number">#{row.rank}</span>
                  )}
                </div>

                <div className="leaderboard-user">
                  <div className="leaderboard-avatar">
                    <span>{initials}</span>
                  </div>
                  <div>
                    <div className="leaderboard-name">
                      {label}
                      {row.is_self && (
                        <span className="badge ms-2 leaderboard-badge-you">
                          You
                        </span>
                      )}
                    </div>
                    <div className="leaderboard-subline">
                      {row.current_streak ?? 0} day
                      {(row.current_streak ?? 0) === 1 ? '' : 's'} streak
                    </div>
                  </div>
                </div>

                <div className="leaderboard-stats">
                  <div className="leaderboard-stat">
                    <span className="label">Total</span>
                    <span className="value">{row.total_completions ?? 0}</span>
                  </div>
                  <div className="leaderboard-stat">
                    <span className="label">Best streak</span>
                    <span className="value">
                      {row.longest_streak ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
