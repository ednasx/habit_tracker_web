# High-Level Architecture

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## System Overview

The Habit Tracker is built as a **microservices-based architecture** deployed on Kubernetes, with the following key components:

- **4 Microservices** (Frontend, Habit Service, User Service, Analytics Service)
- **Message Queue** (RabbitMQ) for asynchronous event-driven communication
- **Managed Database** (Supabase PostgreSQL) with Row-Level Security
- **Monitoring Stack** (Prometheus + Grafana)
- **TLS Termination** (cert-manager + Let's Encrypt)

---

## 1. Microservices Architecture

### 1.1 Frontend Service

**Technology:** React + Vite, served via Nginx  
**Port:** 80  
**Container:** `habit-frontend`

**Responsibilities:**
- Single Page Application (SPA) for user interface
- Supabase Auth integration for login/registration
- Real-time subscriptions to `habit_logs` and `habit_stats` tables
- API calls to backend services via `/api/*` routes

**Key Features:**
- JWT-based authentication
- Real-time updates via Supabase Realtime WebSockets
- Responsive Bootstrap-based UI
- Client-side routing with React Router

---

### 1.2 Habit Service

**Technology:** Node.js + Express  
**Port:** 4000  
**Container:** `habit-service`

**Responsibilities:**
- Habit CRUD operations (Create, Read, Update, Delete, Archive)
- Habit completion logging
- Friend leaderboard queries
- Event publishing to RabbitMQ

**API Endpoints:**
- `GET /api/habits` - List user's habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/logs` - Log habit completion
- `GET /api/leaderboard/friends` - Get friend leaderboard
- `GET /metrics` - Prometheus metrics endpoint
- `GET /api/docs` - Swagger UI documentation

**Events Published:**
- `habit.created` (routing key: `habit.created`)
- `habit.completed` (routing key: `habit.completed`)

**Database Tables Used:**
- `habits` - Habit definitions
- `habit_logs` - Completion logs
- `habit_stats` - Precomputed statistics (read-only)

---

### 1.3 User Service

**Technology:** Node.js + Express  
**Port:** 4001  
**Container:** `user-service`

**Responsibilities:**
- User profile management (username, display name)
- Friend request system (send, accept, reject, remove)
- User search functionality
- Event publishing for friendship changes

**API Endpoints:**
- `GET /api/users/profile` - Get user profile
- `POST /api/users/profile` - Create/update profile
- `GET /api/users/search` - Search users by username
- `GET /api/users/friends` - List accepted friends
- `GET /api/users/friends/pending` - List pending friend requests (received)
- `GET /api/users/friends/sent` - List sent friend requests
- `POST /api/users/friends/request` - Send friend request
- `POST /api/users/friends/:friendId/accept` - Accept friend request
- `POST /api/users/friends/:friendId/reject` - Reject friend request
- `DELETE /api/users/friends/:friendId` - Remove friendship
- `GET /metrics` - Prometheus metrics endpoint
- `GET /api/docs` - Swagger UI documentation

**Events Published:**
- `user.friendship.changed` (routing key: `user.friendship.changed`)

**Database Tables Used:**
- `user_profiles` - User profile information
- `friends` - Friend relationships with status (pending/accepted/rejected)

---

### 1.4 Analytics Service

**Technology:** Node.js + RabbitMQ Consumer  
**Container:** `habit-analytics`

**Responsibilities:**
- Consume events from RabbitMQ
- Compute habit statistics (streaks, totals)
- Update `habit_stats` table asynchronously

**Events Consumed:**
- `habit.completed` - Triggers streak and completion count recalculation
- `user.friendship.changed` - May trigger leaderboard cache invalidation (future)

**Algorithm - Streak Calculation:**
1. Fetch all completion logs for the habit, ordered by date descending
2. Calculate current streak:
   - Start from today or last completion date
   - Count consecutive days backwards
3. Calculate longest streak:
   - Iterate through all logs
   - Track longest consecutive sequence
4. Update `habit_stats` table with computed values

**Database Tables Used:**
- `habit_logs` (read-only) - Source data for calculations
- `habit_stats` (write) - Stores computed statistics

---

## 2. Service Communication Patterns

### 2.1 Synchronous Communication (REST APIs)

```
Frontend → Nginx Ingress → Habit Service
Frontend → Nginx Ingress → User Service
```

- **Protocol:** HTTPS (TLS terminated at Ingress)
- **Authentication:** JWT Bearer tokens in `Authorization` header
- **Format:** JSON request/response bodies

### 2.2 Asynchronous Communication (Event-Driven)

```
Habit Service → RabbitMQ → Analytics Service
User Service → RabbitMQ → Analytics Service
```

- **Protocol:** AMQP (Advanced Message Queuing Protocol)
- **Exchange Type:** Topic exchange (`habit.events`)
- **Routing Keys:**
  - `habit.created`
  - `habit.completed`
  - `user.friendship.changed`
- **Message Format:** JSON payloads

**Benefits:**
- **Decoupling**: Services don't need to know about each other
- **Resilience**: If analytics service is down, events are queued
- **Scalability**: Multiple consumers can process events in parallel
- **Asynchronous Processing**: Long-running calculations don't block API responses

### 2.3 Real-Time Communication (WebSockets)

```
Frontend ←→ Supabase Realtime ←→ PostgreSQL
```

- **Protocol:** WebSocket (via Supabase Realtime)
- **Subscriptions:**
  - `habit_logs` table changes (filtered by user_id)
  - `habit_stats` table changes (filtered by user_id)
- **Use Case:** Automatically refresh UI when habits are completed or stats are updated

---

## 3. Data Flow Examples

### 3.1 User Logs a Habit Completion

```
1. User clicks "Mark Done" button in Frontend
2. Frontend → POST /api/habits/:id/logs → Habit Service
3. Habit Service:
   a. Verifies JWT and extracts user_id
   b. Validates habit ownership
   c. Inserts record into habit_logs table
   d. Publishes habit.completed event to RabbitMQ
   e. Returns 201 Created response
4. RabbitMQ queues the event
5. Analytics Service:
   a. Consumes habit.completed event
   b. Fetches all logs for the habit
   c. Calculates current_streak and longest_streak
   d. Updates habit_stats table
6. Supabase Realtime:
   a. Detects habit_stats table change
   b. Pushes update to subscribed Frontend clients
7. Frontend:
   a. Receives real-time update
   b. Refreshes habit list with new streak values
```

**Latency:**
- API response: ~50-200ms (synchronous)
- Analytics processing: ~500ms-2s (asynchronous)
- Real-time update: ~100-500ms after stats update

### 3.2 User Sends Friend Request

```
1. User searches for friend by username in Frontend
2. Frontend → GET /api/users/search?q=username → User Service
3. User Service returns matching profiles
4. User clicks "Add Friend" button
5. Frontend → POST /api/users/friends/request → User Service
6. User Service:
   a. Verifies JWT
   b. Validates friend_id exists
   c. Inserts record into friends table with status='pending'
   d. Publishes user.friendship.changed event
   e. Returns 201 Created response
7. Friend sees pending request:
   Frontend → GET /api/users/friends/pending → User Service
8. Friend accepts request:
   Frontend → POST /api/users/friends/:friendId/accept → User Service
9. User Service:
   a. Updates friends table status='accepted'
   b. Creates reciprocal friendship record
   c. Publishes user.friendship.changed event
10. Both users can now see each other in leaderboard:
    Frontend → GET /api/leaderboard/friends → Habit Service
```

---

## 4. Deployment Architecture

### 4.1 Kubernetes Resources

**Namespace:** `habit-dev` (development) / `habit-prod` (production)

**Deployments:**
- `habit-frontend` (1 replica)
- `habit-service` (1 replica, can scale horizontally)
- `user-service` (1 replica, can scale horizontally)
- `habit-analytics` (1 replica, can scale horizontally)
- `rabbitmq` (1 replica, StatefulSet with persistent volume)
- `prometheus` (1 replica, with persistent volume)
- `grafana` (1 replica)

**Services:**
- `habit-frontend` (ClusterIP, port 80)
- `habit-service` (ClusterIP, port 4000)
- `user-service` (ClusterIP, port 4001)
- `rabbitmq` (ClusterIP, ports 5672, 15672)
- `habit-tracker-prometheus` (ClusterIP, port 9090)
- `habit-tracker-grafana` (ClusterIP, port 3000)

**Ingress:**
- Host: `habit-tracker.ltu-m7011e-8.se`
- TLS: Enabled via cert-manager + Let's Encrypt
- Routes:
  - `/` → `habit-frontend:80`
  - `/api/habits` → `habit-service:4000`
  - `/api/leaderboard` → `habit-service:4000`
  - `/api/users` → `user-service:4001`
  - `/grafana` → `habit-tracker-grafana:3000`

**Secrets:**
- `supabase-secret` - Contains Supabase credentials (URL, service role key, JWT secret)

**ConfigMaps:**
- `prometheus-config` - Prometheus scrape configuration
- `grafana-datasource` - Grafana Prometheus data source
- `grafana-dashboards-config` - Dashboard provider configuration

**Persistent Volumes:**
- `rabbitmq-pvc` (1Gi) - RabbitMQ message persistence
- `prometheus-pvc` (10Gi) - Prometheus time-series data (15 day retention)

### 4.2 External Dependencies

**Supabase (Managed Service):**
- PostgreSQL database with Row-Level Security
- Authentication service (JWT issuance)
- Realtime service (WebSocket subscriptions)
- **Not self-hosted** - accessed via API

**Docker Hub:**
- Container registry for service images
- Images tagged with Git commit SHA for versioning

---

## 5. Scalability Considerations

### 5.1 Horizontal Scaling

**Services that can scale horizontally:**
- ✅ Habit Service (stateless)
- ✅ User Service (stateless)
- ✅ Analytics Service (multiple consumers can process events in parallel)
- ✅ Frontend (static assets, can use CDN)

**Services with scaling limitations:**
- ⚠️ RabbitMQ (single instance, can be clustered but requires StatefulSet)
- ⚠️ Prometheus (single instance, can use federation for multi-cluster)

### 5.2 Database Scaling

**Current Setup:**
- Supabase managed PostgreSQL (scales automatically)
- Connection pooling via Supabase (PgBouncer)

**Optimization Strategies:**
- Indexes on frequently queried columns (user_id, habit_id, date)
- Unique constraints prevent duplicate logs
- RLS policies filter at database level (efficient)

### 5.3 Caching (Not Implemented)

**Potential Improvements:**
- Redis cache for leaderboard queries
- Frontend caching with service workers
- CDN for static assets

---

## 6. Resilience and Fault Tolerance

### 6.1 Service Failures

**Scenario:** Habit Service crashes
- **Impact:** Users cannot create/update habits or log completions
- **Mitigation:** Kubernetes automatically restarts the pod
- **Recovery Time:** ~10-30 seconds

**Scenario:** Analytics Service crashes
- **Impact:** Statistics are not updated in real-time
- **Mitigation:** 
  - RabbitMQ queues events until service recovers
  - Events are processed when service restarts
  - No data loss (events are persisted in RabbitMQ)
- **Recovery Time:** Statistics catch up within minutes after restart

**Scenario:** RabbitMQ crashes
- **Impact:** Events are not queued (but services continue functioning)
- **Mitigation:**
  - Services log errors but don't crash
  - Persistent volume preserves queued messages
  - Kubernetes restarts RabbitMQ pod
- **Recovery Time:** ~30-60 seconds

### 6.2 Database Failures

**Scenario:** Supabase connection lost
- **Impact:** All API requests fail
- **Mitigation:**
  - Supabase has built-in redundancy and backups
  - Services implement connection retry logic
  - Frontend shows error messages to users
- **Recovery Time:** Depends on Supabase SLA (typically < 5 minutes)

### 6.3 Network Partitions

**Scenario:** Service cannot reach RabbitMQ
- **Impact:** Events are not published
- **Mitigation:**
  - Services catch errors and log warnings
  - API requests still succeed (eventual consistency)
  - Analytics may be temporarily stale
- **Recovery:** Events published after network recovers

---

## 7. Security Architecture

See [04-security.md](./04-security.md) for detailed security documentation.

**Key Security Layers:**
1. **TLS Encryption** - All external traffic encrypted via HTTPS
2. **JWT Authentication** - All API requests require valid JWT
3. **Row-Level Security** - Database enforces data isolation
4. **Input Validation** - All user inputs validated and sanitized
5. **Secrets Management** - Kubernetes Secrets for sensitive data

---

## 8. Monitoring Architecture

See [05-observability.md](./05-observability.md) for detailed monitoring documentation.

**Metrics Collection:**
- Services expose `/metrics` endpoints (Prometheus format)
- Prometheus scrapes metrics every 15 seconds
- Grafana visualizes metrics with custom dashboards

**Key Metrics:**
- HTTP request rate, duration, error rate
- Active habits count
- Habit completions total
- RabbitMQ message publish/consume rates
- Node.js process metrics (CPU, memory, event loop lag)

---

## 9. Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | Vite | 5.x | Build tool |
| | Bootstrap | 5.x | CSS framework |
| | Nginx | Alpine | Static file server |
| **Backend** | Node.js | 22.x | Runtime |
| | Express | 4.x | Web framework |
| | Supabase Client | 2.x | Database & auth client |
| **Database** | Supabase | Managed | PostgreSQL + Auth + Realtime |
| **Message Queue** | RabbitMQ | 3.x | Event broker |
| **Monitoring** | Prometheus | Latest | Metrics collection |
| | Grafana | Latest | Metrics visualization |
| | prom-client | 15.x | Node.js metrics library |
| **Orchestration** | Kubernetes | 1.27+ | Container orchestration |
| | Helm | 3.x | Package manager |
| **CI/CD** | GitHub Actions | - | Automated testing & building |
| | ArgoCD | Latest | GitOps deployment |
| **TLS** | cert-manager | Latest | Certificate management |
| | Let's Encrypt | - | Free TLS certificates |

---

## 10. Architecture Diagrams

See the `/diagrams` folder for visual representations:

- **microservices.png** - Microservices communication diagram
- **cicd.png** - CI/CD pipeline flow
- **security-flow.png** - Security model and request flow
- **monitoring.png** - Monitoring architecture
- **erd.png** - Database entity relationship diagram

---

## Conclusion

The Habit Tracker architecture demonstrates:

✅ **Microservices Design** - Loosely coupled, independently deployable services  
✅ **Event-Driven Architecture** - Asynchronous processing via message queue  
✅ **Scalability** - Stateless services that can scale horizontally  
✅ **Resilience** - Fault tolerance and graceful degradation  
✅ **Observability** - Comprehensive metrics and monitoring  
✅ **Security** - Defense-in-depth with multiple security layers  
✅ **Modern DevOps** - GitOps, automated CI/CD, infrastructure as code  

This architecture is production-ready and follows industry best practices for building scalable, maintainable, and secure web applications.

