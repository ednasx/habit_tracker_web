/**
 * Handles user.friendship.changed events.
 * Called by the RabbitMQ consumer when a friendship is added or removed.
 *
 * Currently logs the event. In the future, this could:
 * - Invalidate leaderboard cache for affected users
 * - Recalculate friend-only leaderboard rankings
 * - Update friend count metrics
 *
 * @param {Object} event - Event payload from RabbitMQ
 * @param {string} event.userId - User ID who initiated the change
 * @param {string} event.friendId - Friend ID being added/removed
 * @param {string} event.action - 'added' or 'removed'
 * @param {string} [event.createdAt] - Timestamp when friendship was created (for 'added')
 * @param {string} [event.removedAt] - Timestamp when friendship was removed (for 'removed')
 */
export async function handleFriendshipChanged(event) {
  const { userId, friendId, action } = event

  if (!userId || !friendId || !action) {
    console.warn('[Analytics] Ignoring invalid user.friendship.changed event payload:', event)
    return
  }

  if (action !== 'added' && action !== 'removed') {
    console.warn('[Analytics] Invalid action in friendship event:', action)
    return
  }

  console.log(
    `[Analytics] Friendship ${action}: user=${userId}, friend=${friendId}`
  )

  // TODO: Future enhancements
  // - Invalidate Redis leaderboard cache for userId and friendId
  // - Recalculate friend-only leaderboard if using Redis sorted sets
  // - Update friend count metrics in analytics database
  // - Trigger leaderboard recalculation for affected users
}

