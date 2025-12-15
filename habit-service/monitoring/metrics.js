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

// Business Metrics
export const activeHabits = new client.Gauge({
  name: 'active_habits',
  help: 'Number of active (non-archived) habits',
  labelNames: ['service'],
  registers: [register]
})

export const habitCompletionsTotal = new client.Counter({
  name: 'habit_completions_total',
  help: 'Total number of habit completions logged',
  labelNames: ['service'],
  registers: [register]
})

// RabbitMQ Metrics
export const rabbitmqMessagesPublished = new client.Counter({
  name: 'rabbitmq_messages_published_total',
  help: 'Total messages published to RabbitMQ',
  labelNames: ['exchange', 'routing_key', 'service'],
  registers: [register]
})

export const rabbitmqMessagesFailed = new client.Counter({
  name: 'rabbitmq_messages_failed_total',
  help: 'Total messages that failed to publish',
  labelNames: ['exchange', 'routing_key', 'service'],
  registers: [register]
})

export const rabbitmqChannelClosed = new client.Counter({
  name: 'rabbitmq_channel_closed_total',
  help: 'Total number of RabbitMQ channel closures',
  labelNames: ['service'],
  registers: [register]
})

export { register }