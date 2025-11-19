# Security Foundation

This document describes the initial security design for the Habit Tracker system.

## 1. Input Validation

### Backend (Express)

- All JSON request bodies are parsed using `express.json()`.
- Habit creation (`POST /api/habits`) currently validates:
  - `name` must be a non-empty string.
- Planned improvements:
  - Use reusable validation middleware (e.g. with `zod`/`joi` or custom functions) for all routes.
  - Validate IDs (e.g. `habit_id`) as numeric and positive.
  - Normalize/trim all string input before storing.

### Frontend (React)

- The frontend performs basic client-side checks (e.g. “habit name is required”).
- Client-side validation is **not trusted** as security; the backend always validates again.

---

## 2. SQL Injection Protection

- All database access will be via:
  - Supabase client library (`@supabase/supabase-js`), or
  - Parameterized queries when using `pg`.
- We will **never** build SQL by concatenating user input into strings.
- Supabase APIs and RLS policies will be used to enforce access control at the database layer.

---

## 3. Authentication & Authorization

- Supabase Auth is used for user authentication.
- Supabase issues JWTs for authenticated users.
- The backend includes a `requireAuth` middleware that:
  - Reads `Authorization: Bearer <token>` header.
  - Verifies the token using `SUPABASE_JWT_SECRET`.
  - Attaches `req.user` with at least:
    - `id` (user id, from `sub`)
    - `email`
    - `role`
- Future plan:
  - Protect habit endpoints (e.g. `/api/habits`) using `requireAuth`.
  - Use `req.user.id` to scope all DB queries.
  - Use Supabase Row-Level Security (RLS) so that `user_id = auth.uid()` at the database level.

---

## 4. Secrets Management

- Secrets (Supabase keys, JWT secret, RabbitMQ URL, DB connection strings) are **not committed** to git.
- Local development uses `.env` files (ignored by git) based on `.env.example`.
- CI and Kubernetes deployment will use:
  - GitHub Actions secrets, and
  - Kubernetes Secrets (mounted as env vars) for production-like environments.

---

## 5. Row-Level Security (RLS)

- RLS will be enabled on:
  - `public.habits`
  - `public.habit_logs`
- Policies will ensure:
  - Users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` rows where `user_id = auth.uid()`.
- This provides defense-in-depth: even if the backend has a bug, the DB will still prevent cross-user data leaks.

# Authorization

- All API endpoints require JWT-based authentication (Supabase) via `requireAuth`.
- Backend queries always filter by `user_id = req.user.id`.
- Supabase Row-Level Security (RLS) ensures that:
  - rows in `habits`, `habit_logs`, and `habit_stats` are only accessible by their owner.
  - `friends` table rows can only be created/modified by the user themselves.
- Leaderboard queries are restricted to the authenticated user’s friends.

