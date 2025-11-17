import express from 'express'
import cors from 'cors'
import habitsRoutes from './routes/habitsRoutes.js'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())

// Health check (optional but useful)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'habit-backend' })
})

// Mount routes
app.use('/api/habits', habitsRoutes)

// Start server
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
