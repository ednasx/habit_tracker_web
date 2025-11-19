import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import leaderboardRouter from './routes/leaderboardRoutes.js'
import { requireAuth } from './auth/authMiddleware.js'
import habitsRouter from './routes/habitsRoutes.js'

dotenv.config()

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to load OpenAPI spec, but don't crash if it fails
let openapiDocument = null
const openapiPath = path.join(__dirname, 'openapi.yaml')

try {
  openapiDocument = YAML.load(openapiPath)
  console.log('[API docs] Loaded OpenAPI spec from', openapiPath)
} catch (err) {
  console.warn('[API docs] Could not load openapi.yaml:', err.message)
}

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors())
app.use(express.json())

// Swagger UI (only if spec loaded)
if (openapiDocument) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
}

// Simple health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'habit-backend' })
})

// Protected habits routes
app.use('/api/habits', requireAuth, habitsRouter)

// Leaderboard routes
app.use('/api/leaderboard', requireAuth, leaderboardRouter)

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`)
})

// at bottom
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`)
  })
}

export default app
