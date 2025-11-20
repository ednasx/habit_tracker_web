import { Router } from 'express'
import { getUserProfile, listFriends } from '../services/userService.js'

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

export default router

