import { Router } from 'express'
import {
  getUserProfile,
  createOrUpdateProfile,
  searchUsersByUsername,
  getUserByUsername,
  listFriends,
  listPendingFriendRequests,
  listSentFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
} from '../services/userService.js'
import { publishFriendshipChangedEvent } from '../messaging/rabbitmq.js'

const router = Router()

// GET /api/users/profile - Get current user's profile
router.get('/profile', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: user not authenticated' })
  }
  try {
    const profile = await getUserProfile(userId)
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found. Please create your profile.' })
    }
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users/profile - Create or update user profile (set username)
router.post('/profile', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  const { username, display_name } = req.body

  if (!username) {
    return res.status(400).json({ message: 'Username is required' })
  }

  try {
    const profile = await createOrUpdateProfile(userId, { username, display_name })
    res.status(201).json(profile)
  } catch (err) {
    console.error('[users] POST /profile error:', err.message)
    if (err.message.includes('already taken')) {
      return res.status(409).json({ message: err.message })
    }
    if (err.message.includes('must be')) {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

// GET /api/users/search?q=username - Search users by username
router.get('/search', async (req, res) => {
  const searchQuery = req.query.q

  if (!searchQuery) {
    return res.status(400).json({ message: 'Search query (q) is required' })
  }

  try {
    const users = await searchUsersByUsername(searchQuery)
    res.json(users)
  } catch (err) {
    console.error('[users] GET /search error:', err.message)
    res.status(500).json({ message: 'Failed to search users' })
  }
})

// GET /api/users/friends - List accepted friends
router.get('/friends', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' })
  }
  try {
    const friends = await listFriends(userId)
    res.json(friends)
  } catch (err) {
    console.error('[users] GET /friends error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/friends/pending - List pending friend requests received
router.get('/friends/pending', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User not authenticated' })
  }
  try {
    const requests = await listPendingFriendRequests(userId)
    res.json(requests)
  } catch (err) {
    console.error('[users] GET /friends/pending error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/users/friends/sent - List sent friend requests
router.get('/friends/sent', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const requests = await listSentFriendRequests(userId)
    res.json(requests)
  } catch (err) {
    console.error('[users] GET /friends/sent error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users/friends/request - Send friend request by username
router.post('/friends/request', async (req, res) => {
  const userId = req.user?.id
  const { username } = req.body

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ message: 'Username is required' })
  }

  try {
    // Look up user by username
    const targetUser = await getUserByUsername(username)
    const friendId = targetUser.user_id

    // Send friend request
    const request = await sendFriendRequest(userId, friendId)

    // Publish friendship changed event
    publishFriendshipChangedEvent({
      userId,
      friendId,
      action: 'request_sent',
      createdAt: request.created_at,
    })

    res.status(201).json({
      message: 'Friend request sent',
      request: {
        friend_id: friendId,
        username: targetUser.username,
        status: request.status,
        created_at: request.created_at,
      },
    })
  } catch (err) {
    console.error('[users] POST /friends/request error:', err.message)
    if (err.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' })
    }
    if (err.message === 'Cannot add yourself as a friend') {
      return res.status(400).json({ message: err.message })
    }
    if (
      err.message.includes('already sent') ||
      err.message.includes('already friends') ||
      err.message.includes('already sent you')
    ) {
      return res.status(409).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to send friend request' })
  }
})

// POST /api/users/friends/:friendId/accept - Accept friend request
router.post('/friends/:friendId/accept', async (req, res) => {
  const userId = req.user?.id
  const friendId = req.params.friendId

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  if (!friendId || typeof friendId !== 'string') {
    return res.status(400).json({ message: 'Invalid friend ID' })
  }

  try {
    const friendship = await acceptFriendRequest(userId, friendId)

    // Publish friendship changed event
    publishFriendshipChangedEvent({
      userId,
      friendId,
      action: 'accepted',
      updatedAt: friendship.updated_at,
    })

    res.status(200).json({
      message: 'Friend request accepted',
      friendship,
    })
  } catch (err) {
    console.error('[users] POST /friends/:friendId/accept error:', err.message)
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to accept friend request' })
  }
})

// POST /api/users/friends/:friendId/reject - Reject friend request
router.post('/friends/:friendId/reject', async (req, res) => {
  const userId = req.user?.id
  const friendId = req.params.friendId

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  if (!friendId || typeof friendId !== 'string') {
    return res.status(400).json({ message: 'Invalid friend ID' })
  }

  try {
    const friendship = await rejectFriendRequest(userId, friendId)

    // Publish friendship changed event
    publishFriendshipChangedEvent({
      userId,
      friendId,
      action: 'rejected',
      updatedAt: friendship.updated_at,
    })

    res.status(200).json({
      message: 'Friend request rejected',
      friendship,
    })
  } catch (err) {
    console.error('[users] POST /friends/:friendId/reject error:', err.message)
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to reject friend request' })
  }
})

// DELETE /api/users/friends/:friendId - Remove friend
router.delete('/friends/:friendId', async (req, res) => {
  const userId = req.user?.id
  const friendId = req.params.friendId

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  if (!friendId || typeof friendId !== 'string') {
    return res.status(400).json({ message: 'Invalid friend ID' })
  }

  try {
    const friendship = await removeFriendship(userId, friendId)

    // Publish friendship changed event
    publishFriendshipChangedEvent({
      userId,
      friendId,
      action: 'removed',
      removedAt: new Date().toISOString(),
    })

    res.status(204).send()
  } catch (err) {
    console.error('[users] DELETE /friends/:friendId error:', err.message)
    if (err.message === 'Friendship not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to remove friendship' })
  }
})

export default router

