# Database Schema – Habit Tracker (Supabase)

## 1. users

Managed primarily by Supabase Auth.

| Column       | Type        | Constraints                          | Notes                         |
|-------------|-------------|--------------------------------------|------------------------------|
| id          | uuid        | PK, default uuid_generate_v4()       | Same as Supabase auth user id |
| email       | text        | unique                               | Cached from auth metadata    |
| created_at  | timestamptz | default now()                        |                               |

> In many setups you can just use `auth.users` and only create a `profiles` table. This is kept simple.

---

## 2. habits

Represents a single habit that a user wants to track.

| Column       | Type        | Constraints                               | Notes                    |
|-------------|-------------|-------------------------------------------|-------------------------|
| id          | bigserial   | PK                                        |                         |
| user_id     | uuid        | FK → users.id (or auth.users.id)          | Owner of the habit      |
| name        | text        | NOT NULL                                  | Habit title             |
| description | text        | NULL                                      | Optional description    |
| created_at  | timestamptz | DEFAULT now()                             |                         |
| archived    | boolean     | DEFAULT false                             | For soft-delete later   |

---

## 3. habit_logs

Stores individual check-ins (e.g. “did this habit on this day”).

| Column       | Type        | Constraints                                  | Notes                       |
|-------------|-------------|----------------------------------------------|----------------------------|
| id          | bigserial   | PK                                           |                            |
| habit_id    | bigint      | FK → habits.id ON DELETE CASCADE            |                            |
| user_id     | uuid        | FK → users.id                                | Redundant but useful       |
| date        | date        | NOT NULL                                     | Logical day of the log     |
| value       | integer     | NOT NULL DEFAULT 1                           | e.g. 1 = done, 0 = missed  |
| created_at  | timestamptz | DEFAULT now()                                |                            |

Unique constraint idea:

- `(habit_id, date)` to prevent duplicate logs per day.

---

## 4. Suggested SQL (Supabase SQL editor)

```sql
-- users (optional if you rely only on auth.users)
create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.habits (
  id bigserial primary key,
  user_id uuid not null references public.users(id),
  name text not null,
  description text,
  created_at timestamptz default now(),
  archived boolean default false
);

create table if not exists public.habit_logs (
  id bigserial primary key,
  habit_id bigint not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.users(id),
  date date not null,
  value integer not null default 1,
  created_at timestamptz default now(),
  unique (habit_id, date)
);
