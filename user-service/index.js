import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import { requireAuth } from './auth/authMiddleware.js'
import usersRouter from './routes/usersRoutes.js'
import { register, totalUsers } from './monitoring/metrics.js'
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
const PORT = process.env.PORT || 4001

app.use(metricsMiddleware)
app.use(helmet())
app.use(cors())
app.use(express.json())

// Swagger UI (only if spec loaded)
if (openapiDocument) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
}

// Simple health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' })
})

// Metrics endpoint for Prometheus (NOT protected by auth)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// Protected user routes
app.use('/api/users', requireAuth, usersRouter)

/**
 * Initialize metrics from database on startup.
 * This ensures the totalUsers gauge reflects the actual state
 * rather than starting at 0 after every restart.
 */
async function initializeMetrics() {
  try {
    console.log('[Metrics] Initializing totalUsers gauge...')
    
    // Query database for current count of user profiles
    const { count, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('[Metrics] Failed to query user count:', error.message)
      return
    }
    
    // Set the gauge to the actual database value
    totalUsers.set({ service: 'user-service' }, count || 0)
    console.log(`[Metrics] ✅ Set totalUsers gauge to ${count}`)
    
  } catch (err) {
    console.error('[Metrics] Error initializing metrics:', err.message)
    // Don't crash the service if metrics initialization fails
  }
}

// at bottom
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[Server] Listening on port ${PORT}`)
    console.log(`[User Service] Metrics available at http://localhost:${PORT}/metrics`)
    
    // Initialize metrics after server starts
    await initializeMetrics()
  })
}

export default app
