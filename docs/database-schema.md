# Database Schema – Habit Tracker (Supabase)

This document describes the **current database schema** used by Habit Tracker in Supabase.

## Users / Identity

User accounts are managed by **Supabase Auth**, stored in `auth.users`.

All application tables reference the authenticated user using `uuid` foreign keys that point to:

- `auth.users.id`

> We do **not** maintain a separate `public.users` table. The system treats `auth.users` as the source of truth.

---

## 1) habits

Represents a single habit that a user wants to track.

| Column       | Type        | Constraints / Notes |
|-------------|-------------|---------------------|
| id          | int8        | PK |
| user_id     | uuid        | FK → `auth.users.id` (owner) |
| name        | text        | NOT NULL |
| description | text        | NULL |
| created_at  | timestamptz | DEFAULT now() |
| archived    | bool        | DEFAULT false |

---

## 2) habit_logs

Stores individual check-ins (e.g., “did this habit on this day”).

| Column       | Type        | Constraints / Notes |
|-------------|-------------|---------------------|
| id          | int8        | PK |
| habit_id    | int8        | FK → `habits.id` ON DELETE CASCADE |
| user_id     | uuid        | FK → `auth.users.id` |
| date        | date        | NOT NULL |
| value       | int4        | NOT NULL DEFAULT 1 |
| created_at  | timestamptz | DEFAULT now() |

### Duplicate prevention (anti-spam)
A unique constraint/index exists on:

- **(habit_id, date)**

This prevents multiple “done today” logs for the same habit/day.

---

## 3) habit_stats

Statistics for habit tracking analytics (typically updated by the analytics service).

| Column              | Type | Constraints / Notes |
|--------------------|------|---------------------|
| habit_id            | int8 | FK → `habits.id` ON DELETE CASCADE |
| user_id             | uuid | FK → `auth.users.id` |
| total_completions   | int4 | NOT NULL DEFAULT 0 |
| current_streak      | int4 | NOT NULL DEFAULT 0 |
| longest_streak      | int4 | NOT NULL DEFAULT 0 |
| last_completed_date | date | NULL |

**Primary key:** `(habit_id, user_id)`

---

## 4) user_profiles

Stores user profile information including a unique username for friend discovery.

| Column        | Type        | Constraints / Notes |
|--------------|-------------|---------------------|
| user_id      | uuid        | PK, FK → `auth.users.id` ON DELETE CASCADE |
| username     | text        | UNIQUE, NOT NULL |
| display_name | text        | NULL |
| created_at   | timestamptz | DEFAULT now() |
| updated_at   | timestamptz | maintained by trigger |

### Username constraints (application rule)
- 3–20 characters
- lowercase alphanumeric, underscores, hyphens only
- must be unique across users

### Triggers / functions
Supabase contains an `update_updated_at_column` trigger function, and triggers that update:
- `user_profiles.updated_at`
- `friends.updated_at`

---

## 5) friends

Manages friend relationships with request/acceptance flow.

| Column      | Type        | Constraints / Notes |
|------------|-------------|---------------------|
| user_id    | uuid        | FK → `auth.users.id` (request sender) |
| friend_id  | uuid        | FK → `auth.users.id` (request receiver) |
| status     | text        | e.g. `pending`, `accepted`, `rejected` |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | maintained by trigger |

**Primary key:** `(user_id, friend_id)`

### Friend request flow (logical model)
1. User A sends friend request to User B → status = `pending`
2. User B accepts → status = `accepted`
3. User B rejects → status = `rejected`

(Exact API behavior depends on user-service implementation; this describes intended semantics.)

---

## 6) Realtime configuration

Supabase Realtime is enabled for:
- `habit_logs`
- `habit_stats`

This supports live updates in the frontend while still respecting RLS policies.

---

## 7) Indexes (as visible in Supabase)

Examples present in Supabase UI:
- `habit_logs`: unique `(habit_id, date)` + PK on `id`
- `habit_stats`: PK `(habit_id, user_id)`
- `user_profiles`: unique index on `username` + PK `user_id`
- `friends`: PK `(user_id, friend_id)` + indexes on `user_id`, `friend_id`, and `status`

---

## 8) Suggested SQL (Supabase SQL editor)

> This is a **reference template** that matches the current conceptual schema. Your live database may already contain these objects.

```sql
create table if not exists public.habits (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  archived boolean default false
);

create table if not exists public.habit_logs (
  id bigserial primary key,
  habit_id bigint not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  value integer not null default 1,
  created_at timestamptz default now(),
  unique (habit_id, date)
);

create table if not exists public.habit_stats (
  habit_id bigint references public.habits(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  total_completions integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  primary key (habit_id, user_id)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_profiles_username on public.user_profiles(username);

create table if not exists public.friends (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create index if not exists idx_friends_user_id on public.friends(user_id);
create index if not exists idx_friends_friend_id on public.friends(friend_id);
create index if not exists idx_friends_status on public.friends(status);
