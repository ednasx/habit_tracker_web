# Observability: Monitoring, Metrics, Logs, and Traces

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## Overview

The Habit Tracker implements comprehensive **observability** using:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Metrics visualization and dashboards
- **prom-client** - Node.js Prometheus client library
- **Console Logging** - Application logs (stdout/stderr)

**Note:** Distributed tracing (e.g., Jaeger, OpenTelemetry) is **not currently implemented** but is documented as a future enhancement.

---

## 1. Monitoring Architecture

### 1.1 Components

```
┌──────────────────┐
│ Habit Service    │──┐
│ /metrics         │  │
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ User Service     │──┤ Expose /metrics
│ /metrics         │  │ (Prometheus format)
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ Analytics Service│──┘
│ /metrics         │
└──────────────────┘
         │
         │ Scrape every 15s
         ↓
┌──────────────────┐
│ Prometheus       │
│ (Time-series DB) │
└────────┬─────────┘
         │
         │ Query metrics
         ↓
┌──────────────────┐
│ Grafana          │
│ (Dashboards)     │
└──────────────────┘
```

### 1.2 Prometheus Configuration

**Scrape Configuration:**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'habit-service'
    static_configs:
      - targets: ['habit-service:4000']
    metrics_path: '/metrics'

  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:4001']
    metrics_path: '/metrics'

  - job_name: 'analytics-service'
    static_configs:
      - targets: ['habit-analytics:3000']
    metrics_path: '/metrics'
```

**Storage:**
- Persistent Volume: 10Gi
- Retention: 15 days
- Location: `/prometheus` in container

**Access:**
```bash
kubectl port-forward -n habit-dev svc/habit-tracker-prometheus 9090:9090
# Open http://localhost:9090
```

---

## 2. Metrics Collection

### 2.1 Metrics Implementation

**Metrics Module:** `monitoring/metrics.js`

```javascript
import client from 'prom-client'

// Create Registry
const register = new client.Registry()

// Default metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ register })

// Custom HTTP metrics
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

// Business metrics
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

export { register }
```

### 2.2 Metrics Middleware

**Middleware:** `monitoring/middleware.js`

```javascript
import { httpRequestsTotal, httpRequestDuration } from './metrics.js'
import { SERVICE_NAME } from '../config/service.js'

export function metricsMiddleware(req, res, next) {
  const start = Date.now()

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

**Usage in Express:**
```javascript
import { metricsMiddleware } from './monitoring/middleware.js'
import { register } from './monitoring/metrics.js'

// Apply to all routes
app.use(metricsMiddleware)

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

### 2.3 Metric Types

#### Counter (Monotonically Increasing)
```javascript
habitCompletionsTotal.inc({ service: 'habit-service' })
```

**Use Cases:**
- Total HTTP requests
- Total habit completions
- Total errors

#### Gauge (Can Go Up or Down)
```javascript
activeHabits.set({ service: 'habit-service' }, 42)
```

**Use Cases:**
- Current active habits count
- Current memory usage
- Current queue depth

#### Histogram (Distribution of Values)
```javascript
httpRequestDuration.observe({ 
  method: 'GET', 
  endpoint: '/api/habits',
  service: 'habit-service' 
}, 0.234)  // 234ms
```

**Use Cases:**
- Request duration (p50, p95, p99)
- Response size distribution
- Processing time distribution

---

## 3. Collected Metrics

### 3.1 Default Node.js Metrics

**Automatically collected by prom-client:**

| Metric | Type | Description |
|--------|------|-------------|
| `nodejs_heap_size_total_bytes` | Gauge | Total heap size |
| `nodejs_heap_size_used_bytes` | Gauge | Used heap size |
| `nodejs_external_memory_bytes` | Gauge | External memory (buffers, etc.) |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |
| `nodejs_active_handles` | Gauge | Active handles (timers, sockets) |
| `nodejs_active_requests` | Gauge | Active requests |
| `process_cpu_user_seconds_total` | Counter | User CPU time |
| `process_cpu_system_seconds_total` | Counter | System CPU time |
| `process_resident_memory_bytes` | Gauge | Resident memory size |

### 3.2 HTTP Metrics

**Habit Service, User Service:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, endpoint, status, service | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, endpoint, service | Request duration |

**Example Query:**
```promql
# Requests per second
rate(http_requests_total{service="habit-service"}[5m])

# P95 response time
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{service="habit-service"}[5m])
)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) 
  / sum(rate(http_requests_total[5m])) * 100
```

### 3.3 Business Metrics

**Habit Service:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `active_habits` | Gauge | service | Number of active habits |
| `habit_completions_total` | Counter | service | Total habit completions logged |

**User Service:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `total_users` | Gauge | service | Total registered users |
| `friend_requests_sent_total` | Counter | - | Total friend requests sent |
| `friend_requests_accepted_total` | Counter | - | Total friend requests accepted |
| `friend_requests_rejected_total` | Counter | - | Total friend requests rejected |
| `friendships_removed_total` | Counter | - | Total friendships removed |

**Example Query:**
```promql
# Total habit completions across all users
sum(habit_completions_total)

# Friend request acceptance rate
friend_requests_accepted_total / friend_requests_sent_total * 100
```

### 3.4 RabbitMQ Metrics

**Habit Service, User Service:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `rabbitmq_messages_published_total` | Counter | exchange, routing_key, service | Messages published |
| `rabbitmq_messages_failed_total` | Counter | exchange, routing_key, service | Failed publishes |

**Example Query:**
```promql
# Message publish rate
rate(rabbitmq_messages_published_total[5m])

# Message failure rate
rate(rabbitmq_messages_failed_total[5m])
```

---

## 4. Grafana Dashboards

### 4.1 Grafana Configuration

**Access:**
```bash
kubectl port-forward -n habit-dev svc/habit-tracker-grafana 3000:3000
# Open http://localhost:3000
```

**Credentials:**
- Username: `admin`
- Password: (stored in Kubernetes Secret or values.yaml)

**Data Source:**
- Type: Prometheus
- URL: `http://habit-tracker-prometheus:9090`
- Access: Server (default)

### 4.2 Dashboard: System Overview

**Panels:**

1. **Request Rate (QPS)**
   ```promql
   sum(rate(http_requests_total[5m])) by (service)
   ```

2. **Error Rate (%)**
   ```promql
   sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
     / sum(rate(http_requests_total[5m])) by (service) * 100
   ```

3. **P95 Response Time**
   ```promql
   histogram_quantile(0.95, 
     sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
   )
   ```

4. **Memory Usage**
   ```promql
   nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
   ```

5. **CPU Usage**
   ```promql
   rate(process_cpu_user_seconds_total[5m]) * 100
   ```

6. **Event Loop Lag**
   ```promql
   nodejs_eventloop_lag_seconds
   ```

### 4.3 Dashboard: Habit Service

**Panels:**

1. **Active Habits**
   ```promql
   active_habits{service="habit-service"}
   ```

2. **Habit Completions (Rate)**
   ```promql
   rate(habit_completions_total[5m])
   ```

3. **Requests by Endpoint**
   ```promql
   sum(rate(http_requests_total{service="habit-service"}[5m])) by (endpoint)
   ```

4. **Response Time by Endpoint**
   ```promql
   histogram_quantile(0.95,
     sum(rate(http_request_duration_seconds_bucket{service="habit-service"}[5m])) 
     by (le, endpoint)
   )
   ```

### 4.4 Dashboard: RabbitMQ

**Panels:**

1. **Message Publish Rate**
   ```promql
   sum(rate(rabbitmq_messages_published_total[5m])) by (routing_key)
   ```

2. **Message Failure Rate**
   ```promql
   sum(rate(rabbitmq_messages_failed_total[5m])) by (routing_key)
   ```

3. **Queue Depth** (requires RabbitMQ exporter - not implemented)
   ```promql
   rabbitmq_queue_messages{queue="habit-analytics"}
   ```

---

## 5. Logging

### 5.1 Current Implementation

**Application Logs:**
- All services log to **stdout/stderr**
- Logs captured by Kubernetes
- Viewable via `kubectl logs`

**Log Format:**
```javascript
console.log('[habit-service] GET /api/habits - 200 OK - 45ms')
console.error('[habit-service] Error connecting to RabbitMQ:', err.message)
```

**Viewing Logs:**
```bash
# View logs for a specific pod
kubectl logs -f deployment/habit-service -n habit-dev

# View logs for all pods in a service
kubectl logs -f -l app=habit-service -n habit-dev

# View logs from previous container (if crashed)
kubectl logs --previous deployment/habit-service -n habit-dev

# Tail last 100 lines
kubectl logs --tail=100 deployment/habit-service -n habit-dev
```

### 5.2 Log Levels (Not Implemented)

**Future Enhancement:**

```javascript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
})

logger.info('Habit created', { habitId: 123, userId: 'user-456' })
logger.error('Database connection failed', { error: err.message })
logger.debug('Processing event', { event })
```

**Benefits:**
- Structured logging (JSON)
- Log levels (debug, info, warn, error)
- Contextual information (user_id, request_id)
- Easier to parse and query

### 5.3 Centralized Logging (Not Implemented)

**Future Enhancement: ELK Stack or Loki**

```
Services → stdout/stderr
   ↓
Kubernetes logs
   ↓
Fluent Bit (log shipper)
   ↓
Elasticsearch (storage)
   ↓
Kibana (visualization)
```

**Benefits:**
- Centralized log aggregation
- Full-text search across all services
- Log retention and archival
- Alerting on log patterns

**Alternative: Grafana Loki**
- Lightweight alternative to ELK
- Integrates with Grafana
- Label-based indexing (like Prometheus)

---

## 6. Distributed Tracing (Not Implemented)

### 6.1 Current Limitation

**Problem:**
- No visibility into request flow across services
- Cannot trace a single user request through multiple services
- Difficult to identify bottlenecks in distributed system

**Example Scenario:**
```
User logs habit completion
  → Frontend → Habit Service → RabbitMQ → Analytics Service → Supabase
```

**Questions we cannot answer:**
- How long did each step take?
- Where is the bottleneck?
- Which service caused the error?

### 6.2 Proposed Solution: OpenTelemetry + Jaeger

**Architecture:**
```
Services (instrumented with OpenTelemetry)
   ↓ Export spans
Jaeger Agent (sidecar or DaemonSet)
   ↓ Forward spans
Jaeger Collector
   ↓ Store spans
Jaeger Storage (Elasticsearch or Cassandra)
   ↓ Query spans
Jaeger UI (visualization)
```

**Implementation Steps:**

1. **Install OpenTelemetry SDK:**
   ```bash
   npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
   ```

2. **Instrument Services:**
   ```javascript
   import { NodeSDK } from '@opentelemetry/sdk-node'
   import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
   import { JaegerExporter } from '@opentelemetry/exporter-jaeger'

   const sdk = new NodeSDK({
     traceExporter: new JaegerExporter({
       endpoint: 'http://jaeger-collector:14268/api/traces'
     }),
     instrumentations: [getNodeAutoInstrumentations()]
   })

   sdk.start()
   ```

3. **Deploy Jaeger:**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
   kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/operator.yaml
   ```

4. **Create Jaeger Instance:**
   ```yaml
   apiVersion: jaegertracing.io/v1
   kind: Jaeger
   metadata:
     name: habit-tracker-jaeger
     namespace: habit-dev
   ```

**Benefits:**
- End-to-end request tracing
- Service dependency mapping
- Performance bottleneck identification
- Root cause analysis for errors

**Example Trace:**
```
Trace ID: abc123def456
Total Duration: 1.2s

Span 1: Frontend → Habit Service (50ms)
Span 2: Habit Service → Supabase (200ms)
Span 3: Habit Service → RabbitMQ (10ms)
Span 4: Analytics Service ← RabbitMQ (5ms)
Span 5: Analytics Service → Supabase (900ms) ← BOTTLENECK!
```

---

## 7. Alerting (Not Implemented)

### 7.1 Prometheus Alerting Rules

**Future Enhancement:**

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
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.service }}"
          description: "P95 response time is {{ $value }}s"

      - alert: ServiceDown
        expr: up{job=~"habit-service|user-service|analytics-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service has been down for more than 1 minute"
```

### 7.2 Alertmanager Configuration

**Future Enhancement:**

```yaml
route:
  receiver: 'team-email'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

**Notification Channels:**
- Email
- Slack
- PagerDuty
- Discord webhook

---

## 8. Health Checks

### 8.1 Kubernetes Liveness and Readiness Probes

**Deployment Configuration:**
```yaml
spec:
  containers:
    - name: habit-service
      livenessProbe:
        httpGet:
          path: /api/health
          port: 4000
        initialDelaySeconds: 30
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3

      readinessProbe:
        httpGet:
          path: /api/health
          port: 4000
        initialDelaySeconds: 10
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
```

**Health Endpoint:**
```javascript
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'habit-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})
```

**Liveness Probe:**
- Checks if container is alive
- Kubernetes restarts container if probe fails
- Use for detecting deadlocks or hung processes

**Readiness Probe:**
- Checks if container is ready to accept traffic
- Kubernetes removes pod from service endpoints if probe fails
- Use for detecting temporary unavailability (e.g., database connection lost)

---

## 9. Observability Best Practices

### 9.1 Implemented

✅ **Metrics Instrumentation** - All services expose /metrics  
✅ **Default Metrics** - CPU, memory, event loop lag  
✅ **Business Metrics** - Habit completions, friend requests  
✅ **HTTP Metrics** - Request rate, duration, errors  
✅ **Prometheus Scraping** - Automated metrics collection  
✅ **Grafana Dashboards** - Visual metrics monitoring  
✅ **Health Checks** - Liveness and readiness probes  
✅ **Persistent Storage** - 15-day metric retention  

### 9.2 Not Implemented (Future Enhancements)

⚠️ **Structured Logging** - JSON logs with context  
⚠️ **Centralized Logging** - ELK or Loki stack  
⚠️ **Distributed Tracing** - OpenTelemetry + Jaeger  
⚠️ **Alerting** - Prometheus Alertmanager  
⚠️ **Log Levels** - Debug, info, warn, error  
⚠️ **Correlation IDs** - Track requests across services  
⚠️ **Error Tracking** - Sentry or Rollbar integration  

---

## 10. Monitoring Queries Cheat Sheet

### Request Rate
```promql
sum(rate(http_requests_total[5m])) by (service)
```

### Error Rate
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) 
  / sum(rate(http_requests_total[5m])) * 100
```

### P50 Response Time
```promql
histogram_quantile(0.50, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### P95 Response Time
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### Memory Usage (%)
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

### CPU Usage (%)
```promql
rate(process_cpu_user_seconds_total[5m]) * 100
```

### Event Loop Lag
```promql
nodejs_eventloop_lag_seconds
```

### Active Habits
```promql
active_habits{service="habit-service"}
```

### Habit Completion Rate
```promql
rate(habit_completions_total[5m])
```

---

## Conclusion

The Habit Tracker implements **comprehensive metrics collection and monitoring** with:

✅ **Prometheus** - Time-series metrics storage  
✅ **Grafana** - Visual dashboards and alerting  
✅ **Custom Metrics** - Business and technical metrics  
✅ **Health Checks** - Kubernetes liveness/readiness probes  
✅ **15-Day Retention** - Historical metric analysis  

**Future Enhancements:**
- Structured logging with Winston or Pino
- Centralized log aggregation (ELK or Loki)
- Distributed tracing (OpenTelemetry + Jaeger)
- Alerting with Prometheus Alertmanager
- Error tracking with Sentry

This observability stack provides strong visibility into system health, performance, and behavior, enabling proactive issue detection and rapid troubleshooting.

