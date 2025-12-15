import client from 'prom-client'

// Create a Registry
const register = new client.Registry()

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'nodejs_'
})

// HTTP Request Metrics
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status', 'service'],
  registers: [register]
})

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
})

// Business Metrics for User Service
export const totalUsers = new client.Gauge({
  name: 'total_users',
  help: 'Total number of registered users',
  labelNames: ['service'],
  registers: [register]
})

export const friendRequestsSentTotal = new client.Counter({
  name: 'friend_requests_sent_total',
  help: 'Total number of friend requests sent',
  labelNames: ['service'],
  registers: [register]
})

export const friendRequestsAcceptedTotal = new client.Counter({
  name: 'friend_requests_accepted_total',
  help: 'Total number of friend requests accepted',
  labelNames: ['service'],
  registers: [register]
})

export const friendRequestsRejectedTotal = new client.Counter({
  name: 'friend_requests_rejected_total',
  help: 'Total number of friend requests rejected',
  labelNames: ['service'],
  registers: [register]
})

export const friendshipsRemovedTotal = new client.Counter({
  name: 'friendships_removed_total',
  help: 'Total number of friendships removed',
  labelNames: ['service'],
  registers: [register]
})

export { register }

