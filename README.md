# Habit Tracker Web

A web-based habit tracking application built for the **Design of Dynamic Web Systems** course.

The goal of this project is to provide a small but realistic full-stack system where users can:

- Create and manage habits
- View a dashboard with their habits
- (Later) Add more features such as logging, streaks, analytics and social/leaderboard functionality

The project is intentionally structured in a way that is similar to real-world web systems:
a **React** frontend talking to a **Node.js/Express** backend via a JSON API.

---

## Tech Stack

### Frontend

- **React** (Vite)
- **Bootstrap** for styling
- Custom CSS (gradient background, card hover, simple layout components)
- API client layer (`apiClient.js`, `habitsApi.js`) to talk to the backend

### Backend

- **Node.js** with **Express**
- **ES modules** (`import` / `export`)
- **CORS** to allow the frontend Dev server to call the API
- In-memory "database" for habits (for now)
- Modular routing (`routes/habitsRoutes.js`)

### Dev / Tooling

- Node.js (LTS recommended)
- npm
- Git/GitHub for version control

Future plans (not yet implemented):

- Persistent storage (e.g. Supabase / PostgreSQL)
- Authentication
- More advanced analytics and dashboards
- Containerization and deployment (Docker, Kubernetes, etc.)

---

## Project Structure

```text
habit-tracker-web/
  README.md
  .gitignore

  frontend/
    package.json
    vite.config.*       # Vite config
    index.html          # SPA entry
    src/
      main.jsx          # React entry point
      App.jsx           # Dashboard page content
      index.css         # Global styles
      components/
        HabitForm.jsx
        layout/
          Navbar.jsx
          Footer.jsx
          AppLayout.jsx
      services/
        apiClient.js    # Generic API wrapper around fetch()
        habitsApi.js    # Habit-specific API functions

  backend/
    package.json
    index.js            # Express app entry, mounts routes
    routes/
      habitsRoutes.js   # All /api/habits endpoints
