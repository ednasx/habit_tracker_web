# Monitoring Setup - Prometheus & Grafana

## Overview

The Habit Tracker application includes comprehensive monitoring with:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization dashboards
- **Custom Metrics**: Application-specific metrics for all services

## Architecture

```
Services (habit, user, analytics)
     ↓ expose /metrics endpoint
Prometheus (scrapes metrics every 15s)
     ↓ stores time-series data
Grafana (queries Prometheus)
     ↓ displays dashboards
```

## Accessing the Dashboards

### Grafana UI
```bash
# Port-forward Grafana
kubectl port-forward -n habit-dev svc/habit-tracker-grafana 3000:3000

# Open browser
open http://localhost:3000

# Login
Username: admin
Password: admin123
```

### Prometheus UI
```bash
# Port-forward Prometheus
kubectl port-forward -n habit-dev svc/habit-tracker-prometheus 9090:9090

# Open browser
open http://localhost:9090
```

## Available Dashboards

1. **Habit Tracker - System Overview**
   - Request rate across all services
   - Error rates
   - Response times (p50, p95)
   - RabbitMQ queue depths
   - Pod CPU/Memory usage

2. **Habit Service - Detailed Metrics**
   - Request rate by endpoint
   - Response time by endpoint
   - Active habits gauge
   - Habit completion rate

3. **RabbitMQ - Message Queue Metrics**
   - Queue depth (ready + unacked messages)
   - Message publish/deliver rates
   - Message processing time
   - Consumer count
   - Failed messages

## Instrumenting Services with Metrics

### Step 1: Install prom-client

```bash
cd habit-service  # or user-service, analytics-service
npm install prom-client
```

### Step 2: Create metrics module

Create `monitoring/metrics.js`:

```javascript
import client from 'prom-client'

// Create a Registry
const register = new client.Registry()

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register })

// Custom metrics
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
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
})

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

// RabbitMQ metrics
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

export { register }
```

### Step 3: Add metrics middleware

Create `monitoring/middleware.js`:

```javascript
import { httpRequestsTotal, httpRequestDuration } from './metrics.js'

const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown'

export function metricsMiddleware(req, res, next) {
  const start = Date.now()

  // Capture response finish
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
```

### Step 4: Add /metrics endpoint

In your `index.js`:

```javascript
import express from 'express'
import { register } from './monitoring/metrics.js'
import { metricsMiddleware } from './monitoring/middleware.js'

const app = express()

// Add metrics middleware to all routes
app.use(metricsMiddleware)

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// Your other routes...
app.use('/api/habits', habitsRouter)
```

### Step 5: Record custom metrics

In your business logic:

```javascript
import { activeHabits, habitCompletionsTotal } from './monitoring/metrics.js'

// Update gauge when habits change
export async function listHabits(userId) {
  const habits = await supabaseAdmin
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
  
  // Update active habits gauge
  activeHabits.set({ service: 'habit-service' }, habits.length)
  
  return habits
}

// Increment counter when habit is completed
export async function logHabitCompletion(habitId, userId, date) {
  // ... save to database ...
  
  // Increment completion counter
  habitCompletionsTotal.inc({ service: 'habit-service' })
  
  return log
}
```

### Step 6: Add RabbitMQ metrics

In `messaging/rabbitmq.js`:

```javascript
import { rabbitmqMessagesPublished, rabbitmqMessagesFailed } from '../monitoring/metrics.js'

export async function publishHabitCompletedEvent(event) {
  try {
    const published = channel.publish(
      EXCHANGE_NAME,
      'habit.completed',
      Buffer.from(JSON.stringify(event))
    )
    
    if (published) {
      rabbitmqMessagesPublished.inc({
        exchange: EXCHANGE_NAME,
        routing_key: 'habit.completed',
        service: 'habit-service'
      })
    } else {
      rabbitmqMessagesFailed.inc({
        exchange: EXCHANGE_NAME,
        routing_key: 'habit.completed',
        service: 'habit-service'
      })
    }
  } catch (err) {
    rabbitmqMessagesFailed.inc({
      exchange: EXCHANGE_NAME,
      routing_key: 'habit.completed',
      service: 'habit-service'
    })
    throw err
  }
}
```

## Metric Types

### Counter
Monotonically increasing value (never decreases).
```javascript
const requestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests'
})

requestsTotal.inc()  // Increment by 1
requestsTotal.inc(5) // Increment by 5
```

### Gauge
Value that can go up or down.
```javascript
const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Current active users'
})

activeUsers.set(42)   // Set to 42
activeUsers.inc()     // Increment by 1
activeUsers.dec(5)    // Decrement by 5
```

### Histogram
Observations into configurable buckets.
```javascript
const requestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
})

requestDuration.observe(0.234)  // Observe 234ms
```

## PromQL Query Examples

### Request Rate
```promql
# Requests per second
sum(rate(http_requests_total[5m])) by (service)
```

### Error Rate
```promql
# Error percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) 
  / sum(rate(http_requests_total[5m])) * 100
```

### P95 Response Time
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### RabbitMQ Queue Depth
```promql
rabbitmq_queue_messages{queue="habit-analytics"}
```

## Alerting (Future Enhancement)

Create alert rules in `templates/prometheus-alert-rules.yaml`:

```yaml
groups:
  - name: habit-tracker-alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"
```

## Troubleshooting

### Metrics not appearing in Prometheus

1. Check service annotations:
```bash
kubectl get svc habit-service -n habit-dev -o yaml | grep prometheus
```

2. Check Prometheus targets:
```bash
# Open http://localhost:9090/targets
# Look for your service - should be UP
```

3. Test metrics endpoint directly:
```bash
kubectl port-forward -n habit-dev svc/habit-service 4000:4000
curl http://localhost:4000/metrics
```

### Dashboard shows "No Data"

1. Check Prometheus data source in Grafana
2. Verify PromQL query returns data in Prometheus UI
3. Check time range (use "Last 15 minutes")

### High memory usage

- Reduce retention time in Prometheus deployment
- Decrease scrape frequency
- Reduce label cardinality (avoid high-cardinality labels like user IDs)

## Best Practices

1. **Label Cardinality**: Keep labels low-cardinality
   - ✅ Good: `{service="habit-service", endpoint="/api/habits"}`
   - ❌ Bad: `{service="habit-service", user_id="123456"}`

2. **Metric Naming**: Follow Prometheus conventions
   - Use `_total` suffix for counters
   - Use base units (seconds, bytes, not milliseconds, MB)
   - Use `_seconds` suffix for durations

3. **Recording Rules**: Pre-aggregate expensive queries
4. **Alerts**: Make them actionable, not noisy
5. **Dashboards**: Show the Four Golden Signals first

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)

