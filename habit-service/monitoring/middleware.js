import { httpRequestsTotal, httpRequestDuration } from './metrics.js'

const SERVICE_NAME = process.env.SERVICE_NAME || 'habit-service'

export function metricsMiddleware(req, res, next) {
  const start = Date.now()

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const endpoint = req.route?.path || req.path
    
    // Record request count
    httpRequestsTotal.inc({
      method: req.method,
      endpoint,
      status: res.statusCode,
      service: SERVICE_NAME
    })
    
    // Record request duration
    httpRequestDuration.observe({
      method: req.method,
      endpoint,
      service: SERVICE_NAME
    }, duration)
  })

  next()
}