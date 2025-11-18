import { Router } from 'express'
import { publishHabitCreatedEvent } from '../messaging/rabbitmq.js'
import { listHabits, createHabit as createHabitInDb } from '../services/habitsService.js'

const router = Router()

// GET /api/habits
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id
    const habits = await listHabits(userId)
    res.json(habits)
  } catch (err) {
    console.error('[habits] GET / error:', err.message)
    res.status(500).json({ message: 'Failed to fetch habits' })
  }
})

// POST /api/habits
router.post('/', async (req, res) => {
  const { name, description } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Habit name is required.' })
  }

  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' })
  }

  try {
    const newHabit = await createHabitInDb({
      userId,
      name: name.trim(),
      description: description ? String(description).trim() : null,
    })

    publishHabitCreatedEvent({
      id: newHabit.id,
      name: newHabit.name,
      description: newHabit.description,
      userId: newHabit.user_id,
      createdAt: newHabit.created_at,
    })

    res.status(201).json(newHabit)
  } catch (err) {
    console.error('[habits] POST / error:', err.message)
    res.status(500).json({ message: 'Failed to create habit' })
  }
})

export default router
