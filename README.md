# Habit Tracker Web

A web-based habit tracking application built for the **Design of Dynamic Web Systems** course.

The goal of this project is to provide a small but realistic full-stack system where users can:

- Create and manage habits
- Edit and delete existing habits
- Mark habits as completed for a given day
- View a dashboard with their own habits
- See real-time updates when habits are completed
- (Backend) produce analytics data such as streaks and total completions
- (Backend) expose a social leaderboard (friends + completions)

The project is intentionally structured in a way that is similar to real-world web systems:
a **React** frontend talking to **Node.js/Express** microservices via a JSON API, with **Supabase** for auth + database and **RabbitMQ** for events, plus a separate **analytics service** that consumes events.

---

## Tech Stack

### Frontend

- **React** (Vite)
- **Bootstrap** for styling
- Custom CSS (gradient background, card hover, simple layout components)
- **Supabase Auth** (email/password login & register)
- Supabase **Realtime**:
  - Subscribes to `habit_logs` changes for the current user
  - Automatically refreshes the dashboard when new completions are logged
- API client layer:
  - `apiClient.js` – generic API wrapper around `fetch()` (adds `Authorization` header)
  - `habitsApi.js` – habit-specific API functions:
    - `getHabits`
    - `createHabit`
    - `updateHabit`
    - `deleteHabit`
    - `logHabitCompletionToday`
  - `Leaderboard` UI component consuming `/api/leaderboard/friends`

### Backend Services

The backend logic is split into microservices to demonstrate a scalable architecture:

1. **Habit Service** (Port 4000)
   - **Node.js** with **Express**
   - **ES modules**
   - **Supabase** for data persistence (tables: `habits`, `habit_logs`, `habit_stats`)
   - **RabbitMQ** message queue:
     - Publishes `habit.created` events
     - Publishes `habit.completed` events
   - Modular routing and services:
     - `routes/habitsRoutes.js` – `/api/habits` endpoints
     - `routes/leaderboardRoutes.js` – `/api/leaderboard` endpoints
   - **API Documentation**: `openapi.yaml` served via Swagger UI at `/api/docs`

2. **User Service** (Port 4001)
   - **Node.js** with **Express**
   - Manages User Profiles and Friendships (tables: `user_profiles`, `friends`)
   - Connected to Supabase for data persistence

3. **Analytics Service**
   - Separate Node.js service (runs in its own container)
   - Depends on: `@supabase/supabase-js`, `amqplib`, `dotenv`
   - Responsibilities:
     - Connect to RabbitMQ and consume `habit.completed` events
     - Update the `habit_stats` table: `total_completions`, `current_streak`, `longest_streak`, `last_completed_date`
     - Provide backend and future services with precomputed analytics for users and friends

### Dev / Tooling / Infra

- Node.js 22.x (recommended)
- npm
- Git / GitHub for version control
- **GitHub Actions** CI:
  - Install dependencies
  - Build frontend
  - Run backend tests (Node test runner)
- **Docker & Docker Compose**:
  - Containers for:
    - `frontend`
    - `habit-service`
    - `user-service`
    - `rabbitmq`
    - `analytics-service`
  - Local development:
    - `docker compose up --build` – start full stack
- **Kubernetes + Helm** (for deployment, e.g. via LTU Rancher):
  - Namespaces (e.g. `habit-dev`, `habit-prod`)
  - Helm chart for:
    - Habit Service Deployment + Service
    - User Service Deployment + Service
    - Frontend Deployment + Service
    - Analytics-service Deployment
    - RabbitMQ Deployment + Service
  - K8s Secrets for:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_JWT_SECRET`
- **GitOps (planned / infrastructure)**:
  - Argo CD `Application` manifest (`infra/gitops/habit-tracker-application.yaml`) to sync Helm chart from Git to cluster
- **HTTPS / SSL (planned / infrastructure)**:
  - `cert-manager` + Let’s Encrypt `ClusterIssuer`
  - Frontend `Ingress` with TLS enabled
- **Swagger / OpenAPI**:
  - `habit-service/openapi.yaml` – API description
  - Swagger UI endpoint at `/api/docs`
- **Testing**:
  - `habit-service/tests/authMiddleware.test.js` – tests for `requireAuth`
  - `habit-service/tests/habitsRoutes.test.js` – basic failure tests (unauthorized, validation errors)
- **Security / Authorization**:
  - JWT-based authentication via Supabase
  - RLS on `habits`, `habit_logs`, `habit_stats`, `friends`, etc.
  - Backend always filters by `user_id = req.user.id` to enforce ownership

---

## Project Structure

```text
habit-tracker-web/
  README.md
  MISSING_AND_TODOS.md        # Checklist for setup
  .gitignore
  docker-compose.yml

  frontend/
    package.json
    vite.config.*               # Vite config
    index.html                  # SPA entry
    .env.example
    src/
      main.jsx                  # React entry point
      App.jsx                   # Auth + dashboard + habit list/actions
      index.css                 # Global styles
      components/
        HabitForm.jsx           # Create new habits
        HabitsList.jsx          # List habits + actions
        Leaderboard.jsx         # Friends leaderboard UI
        auth/
          AuthPage.jsx          # Login / Register page
        layout/
          Navbar.jsx
          Footer.jsx
          AppLayout.jsx
      hooks/
        useHabitsController.js  # Encapsulates habit state, CRUD, realtime updates
      lib/
        supabaseClient.js       # Supabase client (frontend)
      services/
        apiClient.js            # Generic API wrapper around fetch()
        habitsApi.js            # Habit-specific API functions

  habit-service/                # Was 'backend'; handles Habits & Leaderboard
    package.json
    Dockerfile
    .env.example
    index.js                    # Express app entry, mounts routes & Swagger UI
    openapi.yaml                # OpenAPI spec for API docs
    auth/
      authMiddleware.js         # Supabase JWT verification (requireAuth)
    config/
      supabaseClient.js         # Supabase admin client (service role)
    routes/
      habitsRoutes.js           # All /api/habits endpoints
      leaderboardRoutes.js      # /api/leaderboard/friends endpoint
    services/
      habitsService.js          # Supabase queries for habits & logs
      leaderboardService.js     # Supabase queries for friend leaderboard
    messaging/
      rabbitmq.js               # RabbitMQ connection + habit event publishers
    tests/
      authMiddleware.test.js    # Node tests for auth middleware
      habitsRoutes.test.js      # Basic error-case tests for habits API

  user-service/                 # NEW: handles User Profiles & Friends
    package.json
    Dockerfile
    .env.example
    index.js
    routes/
      usersRoutes.js            # /api/users/profile, /api/users/friends
    services/
      userService.js            # User & Friends logic

  analytics-service/
    package.json
    Dockerfile
    .env.example
    index.js                    # RabbitMQ consumer updating habit_stats via Supabase

  docs/
    database-schema.md          # DB design (habits, habit_logs, habit_stats, friends, user_profiles)
    security.md                 # Security model (auth, RLS, authorization rules)
    realtime.md                 # Supabase realtime configuration (habit_logs, habit_stats)

  infra/
    k8s/
      namespaces.yaml           # habit-dev and habit-prod namespaces
    helm/
      habit-tracker/
        Chart.yaml
        values.yaml
        templates/
          habit-service-deployment.yaml
          habit-service-service.yaml
          user-service-deployment.yaml
          user-service-service.yaml
          frontend-deployment.yaml
          frontend-service.yaml
          analytics-deployment.yaml
          rabbitmq-deployment.yaml
          ingress.yaml          # Frontend ingress with HTTPS (via cert-manager)
          supabase-secret.yaml  # K8s Secret for Supabase env vars
  infra/gitops/
    habit-tracker-application.yaml  # Argo CD Application for GitOps deployment
  infra/k8s/
    cluster-issuer.yaml             # cert-manager ClusterIssuer for Let's Encrypt

  supabase/
    rls-policies.sql            # RLS policies for habits, habit_logs, habit_stats, friends, etc.

  .github/
    workflows/
      ci.yml                    # GitHub Actions CI pipeline
 ``` 

## Running the App Locally

### With Docker (recommended)

From the project root:

```bash
docker compose up --build
```

Then open the frontend in your browser (depending on your docker-compose.yml):

```text
http://localhost:5173   # or whatever port is mapped for the frontend service
```

### With npm (dev mode)

### Habit Service
```bash
cd habit-service
cp .env.example .env      # fill in Supabase & RabbitMQ values
npm install
npm run dev
```
This starts the API server (by default on http://localhost:4000/api).

### User Service
```bash
cd user-service
cp .env.example .env
npm install
npm run dev
```
This starts the User service (by default on http://localhost:4001/api).

### Frontend
```bash
cd frontend
cp .env.example .env      # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
npm install
npm run dev
```
Then open the URL printed by Vite, for example:

```text
http://localhost:5173
```
