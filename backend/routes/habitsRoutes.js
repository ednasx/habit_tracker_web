import { Router } from 'express'
import { publishHabitCreatedEvent } from '../messaging/rabbitmq.js'

const router = Router()

// In-memory "database" for now – stays here for simplicity
let nextId = 3
let habits = [
  { id: 1, name: 'Drink water', description: 'Drink 2L of water per day' },
  { id: 2, name: 'Exercise', description: '30 minutes of movement' },
]

// GET /api/habits - list all habits
router.get('/', (req, res) => {
  res.json(habits)
})

// POST /api/habits - create a new habit
router.post('/', (req, res) => {
  const { name, description } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Habit name is required.' })
  }

  const newHabit = {
    id: nextId++,
    name: name.trim(),
    description: description ? String(description).trim() : '',
  }

  habits.push(newHabit)

  // Fire-and-forget event for other services (analytics, notifications, etc.)
  publishHabitCreatedEvent({
    id: newHabit.id,
    name: newHabit.name,
    description: newHabit.description,
    userId: req.user?.id ?? null, // will be real when auth is wired
    createdAt: new Date().toISOString(),
  })

  res.status(201).json(newHabit)
})

export default router
