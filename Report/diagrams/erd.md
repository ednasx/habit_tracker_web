# Database Entity Relationship Diagram

This diagram shows all database tables, their relationships, and key constraints.

```mermaid
erDiagram
    auth_users ||--o| user_profiles : "has profile"
    auth_users ||--o{ habits : "creates"
    auth_users ||--o{ habit_logs : "logs"
    habits ||--o{ habit_logs : "has logs"
    habits ||--|| habit_stats : "has stats"
    user_profiles ||--o{ friends_sender : "sends requests"
    user_profiles ||--o{ friends_receiver : "receives requests"

    auth_users {
        uuid id PK
        text email
        text encrypted_password
        timestamptz created_at
    }

    user_profiles {
        uuid user_id PK,FK
        text username UK,NN
        text display_name
        timestamptz created_at
        timestamptz updated_at
    }

    habits {
        bigserial id PK
        uuid user_id FK,NN
        text name NN
        text description
        timestamptz created_at
        boolean archived
    }

    habit_logs {
        bigserial id PK
        bigint habit_id FK,NN
        uuid user_id FK,NN
        date date NN
        integer value NN
        timestamptz created_at
    }

    habit_stats {
        bigint habit_id PK,FK
        uuid user_id PK,FK
        integer total_completions NN
        integer current_streak NN
        integer longest_streak NN
        date last_completed_date
    }

    friends_sender {
        uuid user_id PK,FK
        uuid friend_id PK,FK
        text status NN
        timestamptz created_at
        timestamptz updated_at
    }

    friends_receiver {
        uuid user_id PK,FK
        uuid friend_id PK,FK
        text status NN
        timestamptz created_at
        timestamptz updated_at
    }
```

## Tables Overview

### auth.users (Supabase Auth)
**Purpose:** User authentication and identity (managed by Supabase)
- Primary Key: `id` (uuid)
- Referenced by all user-related tables

### user_profiles
**Purpose:** User profile information with unique username
- Primary Key: `user_id` (references auth.users.id)
- Unique Constraint: `username`
- Username rules: 3-20 chars, lowercase alphanumeric + `_` `-`
- Trigger: Auto-updates `updated_at` on modification

### habits
**Purpose:** Habit definitions created by users
- Primary Key: `id` (auto-incrementing)
- Foreign Key: `user_id` → auth.users.id (ON DELETE CASCADE)
- Soft delete: `archived` flag instead of hard delete

### habit_logs
**Purpose:** Individual habit completion logs (check-ins)
- Primary Key: `id` (auto-incrementing)
- Foreign Keys:
  - `habit_id` → habits.id (ON DELETE CASCADE)
  - `user_id` → auth.users.id (ON DELETE CASCADE)
- Unique Constraint: `(habit_id, date)` - prevents duplicate logs per day
- Used by analytics service to calculate streaks

### habit_stats
**Purpose:** Precomputed statistics for habits
- Composite Primary Key: `(habit_id, user_id)`
- Foreign Keys:
  - `habit_id` → habits.id (ON DELETE CASCADE)
  - `user_id` → auth.users.id (ON DELETE CASCADE)
- Updated asynchronously by analytics service
- Contains: total completions, current streak, longest streak

### friends
**Purpose:** Friend relationships with request/acceptance flow
- Composite Primary Key: `(user_id, friend_id)`
- Foreign Keys:
  - `user_id` → auth.users.id (request sender)
  - `friend_id` → auth.users.id (request receiver)
- Status values: `pending`, `accepted`, `rejected`
- Bidirectional: When accepted, reciprocal record created
- Trigger: Auto-updates `updated_at` on modification

## Relationships

### One-to-One (1:1)
- `auth.users` ↔ `user_profiles` - Each user has one profile
- `habits` ↔ `habit_stats` - Each habit has one stats record

### One-to-Many (1:N)
- `auth.users` → `habits` - User creates many habits
- `auth.users` → `habit_logs` - User logs many completions
- `habits` → `habit_logs` - Habit has many log entries

### Many-to-Many (M:N)
- `user_profiles` ↔ `friends` - Self-referential friendship table

## Key Constraints

### Foreign Key Constraints (Cascading Deletes)
```sql
-- Deleting a user cascades to all related data
user_profiles.user_id → auth.users.id ON DELETE CASCADE
habits.user_id → auth.users.id ON DELETE CASCADE
habit_logs.user_id → auth.users.id ON DELETE CASCADE

-- Deleting a habit cascades to logs and stats
habit_logs.habit_id → habits.id ON DELETE CASCADE
habit_stats.habit_id → habits.id ON DELETE CASCADE
```

### Unique Constraints
- `user_profiles.username` - Username must be unique across all users
- `habit_logs(habit_id, date)` - One log per habit per day

### Check Constraints
- `friends.status` - Must be one of: `pending`, `accepted`, `rejected`

### NOT NULL Constraints
- Critical fields that must always have values:
  - `user_profiles.username`
  - `habits.user_id`, `habits.name`
  - `habit_logs.habit_id`, `habit_logs.user_id`, `habit_logs.date`, `habit_logs.value`
  - `habit_stats.total_completions`, `habit_stats.current_streak`, `habit_stats.longest_streak`

## Row-Level Security (RLS)

All tables have RLS policies enforcing:
- Users can only see/modify their own data
- `user_profiles`: All users can view (for search), but only modify own
- `habits`, `habit_logs`: Own data only
- `habit_stats`: Own data only (updated by service role)
- `friends`: Can view where involved in relationship, can only create as sender

## Indexes

### Primary Key Indexes (Automatic)
- `user_profiles(user_id)`
- `habits(id)`
- `habit_logs(id)`
- `habit_stats(habit_id, user_id)`
- `friends(user_id, friend_id)`

### Performance Indexes
- `user_profiles(username)` - Username uniqueness + search
- `habits(user_id)` - User's habits lookup
- `habits(archived)` - Filter active habits
- `habit_logs(habit_id)` - Logs for a habit
- `habit_logs(user_id)` - User's logs
- `habit_logs(date)` - Date range queries
- `habit_logs(habit_id, date)` - Unique constraint + performance
- `friends(user_id)` - Friendships sent
- `friends(friend_id)` - Friendships received
- `friends(status)` - Filter by status

## Legend
- **PK** = Primary Key
- **FK** = Foreign Key
- **UK** = Unique Key
- **NN** = NOT NULL
- **Cascade** = ON DELETE CASCADE

