import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import habitsRoutes from './routes/habitsRoutes.js'
import { requireAuth } from './auth/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'habit-backend' })
})

// Protect habits routes with JWT auth
app.use('/api/habits', requireAuth, habitsRoutes)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
