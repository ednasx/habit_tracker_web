import { Router } from 'express'
import {
  getUserProfile,
  listFriends,
  addFriendship,
  removeFriendship,
} from '../services/userService.js'
import { publishFriendshipChangedEvent } from '../messaging/rabbitmq.js'

const router = Router()

router.get('/profile', async (req, res) => {
  const userId = req.user?.id
  try {
    const profile = await getUserProfile(userId)
    res.json(profile || { message: 'Profile not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/friends', async (req, res) => {
  const userId = req.user?.id
  try {
    const friends = await listFriends(userId)
    res.json(friends)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users/friends/:friendId - Add a friend
router.post('/friends/:friendId', async (req, res) => {
  const userId = req.user?.id
  const friendId = req.params.friendId

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  if (!friendId || typeof friendId !== 'string') {
    return res.status(400).json({ message: 'Invalid friend ID' })
  }

  try {
    const friendship = await addFriendship(userId, friendId)

    // Publish friendship changed event
    publishFriendshipChangedEvent({
      userId,
      friendId,
      action: 'added',
      createdAt: friendship.created_at,
    })

    res.status(201).json(friendship)
  } catch (err) {
    console.error('[users] POST /friends/:friendId error:', err.message)
    if (err.message === 'Friendship already exists') {
      return res.status(409).json({ message: err.message })
    }
    if (err.message === 'Cannot add yourself as a friend') {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: 'Failed to add friendship' })
  }
})

// DELETE /api/users/friends/:friendId - Remove a friend
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

