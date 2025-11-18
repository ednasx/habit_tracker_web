import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import habitsRoutes from './routes/habitsRoutes.js'
// import { requireAuth } from './auth/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'habit-backend' })
})

// For now, routes are public; later you can enable auth like:
// app.use('/api/habits', requireAuth, habitsRoutes)
app.use('/api/habits', habitsRoutes)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
