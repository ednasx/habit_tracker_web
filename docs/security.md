# Security

This document describes the security design and controls for the Habit Tracker system.
Where possible, it describes **what is implemented today**, and clearly labels optional future hardening.

---

## 1) Input Validation

### Backend (Express)
- JSON request bodies are parsed using `express.json()`.
- Requests are validated server-side (client validation is not trusted).
- Typical validation rules include:
  - required fields (e.g., habit `name`) must be non-empty strings
  - IDs must be valid types/values (e.g., numeric `habit_id`)
  - strings should be trimmed/normalized before storing

### Frontend (React)
- The frontend performs basic client-side checks (e.g., “habit name is required”) for UX.
- Client-side validation is **not a security boundary**; the backend validates again.

**Optional improvement (hardening):**
- Use a shared validation layer (e.g., `zod`/`joi` or centralized custom validators) across routes to ensure consistent rules.

---

## 2) SQL Injection Protection (REQ22)

- All database access uses:
  - Supabase client library (`@supabase/supabase-js`) query builders, and/or
  - parameterized queries (if raw SQL is ever introduced)
- The application avoids building SQL strings by concatenating untrusted input.
- Access control is enforced via RLS policies at the database layer (defense-in-depth).

---

## 3) XSS Protection (REQ22)

- Frontend is React-based, which escapes text by default when rendering.
- The application should avoid rendering user-controlled HTML via `dangerouslySetInnerHTML`.
- Backend services return JSON APIs (no server-side HTML rendering of user content).

**Optional improvement (hardening):**
- Add security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.) at Nginx/Ingress.

---

## 4) Authentication

- Supabase Auth is used for user authentication.
- Supabase issues JWTs for authenticated users.
- Clients call backend APIs using:

`Authorization: Bearer <token>`

- Backend services verify JWTs using `SUPABASE_JWT_SECRET` and attach `req.user` (id from JWT `sub`).

---

## 5) Authorization (API + DB)

Authorization is enforced in two layers:

### A) API-level authorization
- Endpoints require JWT authentication (via auth middleware).
- Backend queries should scope data using authenticated identity (e.g., `user_id = req.user.id`).

### B) Supabase Row-Level Security (RLS)
- RLS is enabled to prevent cross-user data access even if a service makes a mistake.

---

## 6) Row-Level Security (RLS) Policies (current)

### `habits` (owner-only CRUD)
- SELECT: `auth.uid() = user_id`
- INSERT: `WITH CHECK (auth.uid() = user_id)`
- UPDATE: `USING (auth.uid() = user_id)` + `WITH CHECK (auth.uid() = user_id)`
- DELETE: `USING (auth.uid() = user_id)`

### `habit_logs` (owner-only CRUD)
- SELECT: `auth.uid() = user_id`
- INSERT: `WITH CHECK (auth.uid() = user_id)`
- UPDATE: `USING (auth.uid() = user_id)` + `WITH CHECK (auth.uid() = user_id)`
- DELETE: `USING (auth.uid() = user_id)`

### `habit_stats`
- RLS is enabled.
- A SELECT policy should exist to allow users to read their own stats (commonly: `user_id = auth.uid()`).
> If no policy exists, authenticated users will not be able to read rows under RLS unless using a service role key.

### `friends` (two-sided read, sender-controlled write)
- SELECT: `auth.uid() = user_id OR auth.uid() = friend_id`
- INSERT: `WITH CHECK (auth.uid() = user_id)`
- DELETE: `USING (auth.uid() = user_id)`

This allows both parties to see a friendship row while restricting who can create/delete it.

---

## 7) Data Integrity / Abuse Prevention

- `habit_logs` has a unique constraint/index on `(habit_id, date)`.
  - ✅ prevents repeated “mark done today” spamming from creating duplicate rows for the same habit/day.

---

## 8) Realtime Security

Supabase Realtime is enabled for:
- `habit_logs`
- `habit_stats`

Realtime does **not** bypass RLS; access is still governed by policies.

---

## 9) Secrets Management

Secrets (Supabase keys, JWT secret, RabbitMQ URL, etc.) are **not committed** to Git.

- Local development uses `.env` (ignored by Git) based on `.env.example`.
- CI uses GitHub Actions secrets.
- Kubernetes deployment uses Kubernetes Secrets (env vars mounted into pods).

---

## 10) HTTPS / Certificates (REQ24)

HTTPS is intended to be terminated at the ingress layer using:
- cert-manager
- Let’s Encrypt ClusterIssuer
- Ingress TLS configuration

Full operational details are documented in `docs/certificates.md` (to be added/maintained for REQ24).

---

## Authorization Summary (quick checklist)

- API endpoints require JWT-based authentication via `requireAuth`.
- Backend queries filter by `req.user.id` where applicable.
- Supabase RLS ensures:
  - `habits` and `habit_logs` are only accessible by their owner
  - `friends` can be read by both users involved, but created/deleted by sender
  - `habit_stats` access depends on policies (confirm SELECT policy)
- Leaderboard queries are restricted to the authenticated user’s friends.
