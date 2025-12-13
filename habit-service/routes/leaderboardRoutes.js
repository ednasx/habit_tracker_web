// habit-service/routes/leaderboardRoutes.js
import { Router } from 'express';
import { getFriendsLeaderboard } from '../services/leaderboardService.js';

const router = Router();

router.get('/friends', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 10));

  try {
    const leaderboard = await getFriendsLeaderboard(userId, limit);
    res.json(leaderboard);
  } catch (err) {
    console.error('[leaderboard] GET /friends error:', err);
    res.status(500).json({ message: 'Failed to load leaderboard' });
  }
});

export default router;
