# Habit Tracker Web

A web-based habit tracking application built for the **Design of Dynamic Web Systems** course.

The goal of this project is to provide a small but realistic full-stack system where users can:

- Create and manage habits
- View a dashboard with their own habits
- (Later) add features such as logging, streaks, analytics, and social/leaderboard functionality

The project is intentionally structured in a way that is similar to real-world web systems:
a **React** frontend talking to a **Node.js/Express** backend via a JSON API, with **Supabase** for auth + database and **RabbitMQ** for events.

---

## Tech Stack

### Frontend

- **React** (Vite)
- **Bootstrap** for styling
- Custom CSS (gradient background, card hover, simple layout components)
- **Supabase Auth** (email/password login & register)
- API client layer:
  - `apiClient.js` – generic API wrapper around `fetch()` (adds `Authorization` header)
  - `habitsApi.js` – habit-specific API functions (`getHabits`, `createHabit`)

### Backend

- **Node.js** with **Express**
- **ES modules** (`import` / `export`)
- **CORS** to allow the frontend dev server to call the API
- **Supabase**:
  - Auth (JWT-based) – verified with `SUPABASE_JWT_SECRET`
  - Postgres database (tables: `habits`, `habit_logs`)
  - Row-Level Security (RLS) so users only see their own data
- **RabbitMQ** message queue:
  - Publishes `habit.created` events for future consumers
- Modular routing and services:
  - `routes/habitsRoutes.js` – `/api/habits` endpoints
  - `services/habitsService.js` – Supabase queries
  - `auth/authMiddleware.js` – JWT verification

### Dev / Tooling / Infra

- Node.js 22.x (recommended)
- npm
- Git / GitHub for version control
- **GitHub Actions** CI:
  - Install dependencies
  - Build frontend
  - Run placeholder tests (frontend & backend)
- **Docker & Docker Compose**:
  - Containers for frontend, backend, and RabbitMQ
- **Kubernetes + Helm**:
  - Namespaces (`habit-dev`, `habit-prod`)
  - Basic Helm chart for frontend & backend deployments/services

**Future plans (beyond current implementation):**

- Rich habit logging and streaks (using `habit_logs`)
- Analytics (completion rate, charts, dashboards)
- Notifications & additional event-driven services (email, reminders)
- More advanced security (rate limiting, stricter validation, security headers)
- Automated deployment to Kubernetes (e.g. via LTU Rancher)

---

## Project Structure

```text
habit-tracker-web/
  README.md
  .gitignore
  docker-compose.yml

  frontend/
    package.json
    vite.config.*            # Vite config
    index.html               # SPA entry
    .env.example
    src/
      main.jsx               # React entry point
      App.jsx                # Auth + dashboard
      index.css              # Global styles
      components/
        HabitForm.jsx
        auth/
          AuthPage.jsx       # Login / Register page
        layout/
          Navbar.jsx
          Footer.jsx
          AppLayout.jsx
      lib/
        supabaseClient.js    # Supabase client (frontend)
      services/
        apiClient.js         # Generic API wrapper around fetch()
        habitsApi.js         # Habit-specific API functions

  backend/
    package.json
    Dockerfile
    .env.example
    index.js                 # Express app entry, mounts routes
    auth/
      authMiddleware.js      # Supabase JWT verification
    config/
      supabaseClient.js      # Supabase admin client (service role)
    routes/
      habitsRoutes.js        # All /api/habits endpoints
    services/
      habitsService.js       # Supabase queries for habits
    messaging/
      rabbitmq.js            # RabbitMQ connection + habit.created publisher

  docs/
    database-schema.md       # DB design (habits, habit_logs)
    security.md              # Input validation & SQL injection plan

  infra/
    k8s/
      namespaces.yaml        # habit-dev and habit-prod namespaces
      helm/
        habit-tracker/
          Chart.yaml
          values.yaml
          templates/
            backend-deployment.yaml
            backend-service.yaml
            frontend-deployment.yaml
            frontend-service.yaml

  supabase/
    rls-policies.sql         # RLS policies for habits and habit_logs

  .github/
    workflows/
      ci.yml                 # GitHub Actions CI pipeline
