import { Router } from 'express'
import {
  listHabits,
  createHabit as createHabitInDb,
  getHabitById,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
} from '../services/habitsService.js'
import {
  publishHabitCreatedEvent,
  publishHabitCompletedEvent,
} from '../messaging/rabbitmq.js'

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

// GET /api/habits/:id
router.get('/:id', async (req, res) => {
  const userId = req.user?.id
  const habitId = Number(req.params.id)

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return res.status(400).json({ message: 'Invalid habit id' })
  }

  try {
    const habit = await getHabitById({ userId, habitId })
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' })
    }
    res.json(habit)
  } catch (err) {
    console.error('[habits] GET /:id error:', err.message)
    res.status(500).json({ message: 'Failed to fetch habit' })
  }
})

// PUT /api/habits/:id
router.put('/:id', async (req, res) => {
  const userId = req.user?.id
  const habitId = Number(req.params.id)
  const { name, description } = req.body

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return res.status(400).json({ message: 'Invalid habit id' })
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Habit name is required.' })
  }

  try {
    const updated = await updateHabit({
      userId,
      habitId,
      name: name.trim(),
      description: description ? String(description).trim() : null,
    })

    res.json(updated)
  } catch (err) {
    console.error('[habits] PUT /:id error:', err.message)
    // For simplicity we just return 500; could refine for not found
    res.status(500).json({ message: 'Failed to update habit' })
  }
})

// DELETE /api/habits/:id
router.delete('/:id', async (req, res) => {
  const userId = req.user?.id
  const habitId = Number(req.params.id)

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return res.status(400).json({ message: 'Invalid habit id' })
  }

  try {
    const deleted = await deleteHabit({ userId, habitId })
    if (!deleted) {
      return res.status(404).json({ message: 'Habit not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error('[habits] DELETE /:id error:', err.message)
    res.status(500).json({ message: 'Failed to delete habit' })
  }
})

// POST /api/habits/:id/logs  (completion logging)
router.post('/:id/logs', async (req, res) => {
  const userId = req.user?.id
  const habitId = Number(req.params.id)
  const { date, value } = req.body

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return res.status(400).json({ message: 'Invalid habit id' })
  }

  // Use today's date if not provided
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const logDate = date || today

  try {
    const log = await logHabitCompletion({
      userId,
      habitId,
      date: logDate,
      value: typeof value === 'number' ? value : 1,
    })

    // Publish habit.completed event
    publishHabitCompletedEvent({
      id: log.id,
      habitId: log.habit_id,
      userId: log.user_id,
      date: log.date,
      value: log.value,
      createdAt: log.created_at,
    })

    res.status(201).json(log)
  } catch (err) {
    console.error('[habits] POST /:id/logs error:', err.message)
    res.status(500).json({ message: 'Failed to log habit completion' })
  }
})

export default router
