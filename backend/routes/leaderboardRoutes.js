import { Router } from 'express'
import { getFriendsLeaderboard } from '../services/leaderboardService.js'

const router = Router()

router.get('/friends', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  try {
    const leaderboard = await getFriendsLeaderboard(userId)
    res.json(leaderboard)
  } catch (err) {
    console.error('[leaderboard] GET /friends error:', err.message)
    res.status(500).json({ message: 'Failed to load leaderboard' })
  }
})

export default router
