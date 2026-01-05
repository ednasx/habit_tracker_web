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
import { register, activeHabits } from './monitoring/metrics.js'
import { metricsMiddleware } from './monitoring/middleware.js'
import { supabaseAdmin } from './config/supabaseClient.js'

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

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://habit-tracker.ltu-m7011e-8.se'  // Production: only allow your domain
    : ['http://localhost:5173', 'http://localhost:3000'], // Development: allow localhost
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(metricsMiddleware)
app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())

// Swagger UI (only if spec loaded)
if (openapiDocument) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
}

// Simple health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'habit-backend' })
})

// Metrics endpoint for Prometheus (NOT protected by auth)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// Protected habits routes
app.use('/api/habits', requireAuth, habitsRouter)

// Leaderboard routes
app.use('/api/leaderboard', requireAuth, leaderboardRouter)

/**
 * Initialize metrics from database on startup.
 * This ensures the activeHabits gauge reflects the actual state
 * rather than starting at 0 after every restart.
 */
async function initializeMetrics() {
  try {
    console.log('[Metrics] Initializing activeHabits gauge...')
    
    // Query database for current count of active habits
    const { count, error } = await supabaseAdmin
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false)
    
    if (error) {
      console.error('[Metrics] Failed to query habit count:', error.message)
      return
    }
    
    // Set the gauge to the actual database value
    activeHabits.set({ service: 'habit-service' }, count || 0)
    console.log(`[Metrics] ✅ Set activeHabits gauge to ${count}`)
    
  } catch (err) {
    console.error('[Metrics] Error initializing metrics:', err.message)
    // Don't crash the service if metrics initialization fails
  }
}

// at bottom
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[Server] Listening on port ${PORT}`)
    console.log(`[Habit Service] Metrics available at http://localhost:${PORT}/metrics`)
    
    // Initialize metrics after server starts
    await initializeMetrics()
  })
}

export default app
