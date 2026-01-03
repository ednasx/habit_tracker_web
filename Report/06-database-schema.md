# Database Schema

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## Overview

The Habit Tracker uses **Supabase** (managed PostgreSQL) as its database. The schema includes:

- **5 main tables** (habits, habit_logs, habit_stats, user_profiles, friends)
- **Row-Level Security (RLS)** policies for data isolation
- **Triggers** for automatic timestamp updates
- **Unique constraints** to prevent duplicate entries
- **Foreign keys** for referential integrity

---

## 1. Entity Relationship Diagram

See `diagrams/erd.png` for the visual representation.

**Relationships:**
```
auth.users (Supabase Auth)
    ↓ 1:N
user_profiles
    ↓ 1:N
habits
    ↓ 1:N
habit_logs
    ↓ 1:1
habit_stats

user_profiles ←→ friends (self-referential M:N)
```

---

## 2. Tables

### 2.1 auth.users (Managed by Supabase Auth)

**Purpose:** User authentication and identity

**Managed by:** Supabase Auth (not directly accessed by application)

**Key Columns:**
- `id` (uuid, PK) - User ID
- `email` (text) - User email
- `encrypted_password` (text) - Hashed password
- `created_at` (timestamptz) - Registration timestamp

**Notes:**
- Application references `auth.users.id` as foreign key
- No custom columns added to this table
- All user metadata stored in `user_profiles`

---

### 2.2 user_profiles

**Purpose:** User profile information (username, display name)

**Schema:**
```sql
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX user_profiles_username_key ON user_profiles(username);
CREATE INDEX user_profiles_user_id_idx ON user_profiles(user_id);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | uuid | PK, FK → auth.users(id) | User ID |
| username | text | UNIQUE, NOT NULL | Unique username (3-20 chars) |
| display_name | text | NULL | Optional display name |
| created_at | timestamptz | DEFAULT now() | Profile creation time |
| updated_at | timestamptz | DEFAULT now() | Last update time |

**Business Rules:**
- Username must be 3-20 characters
- Lowercase alphanumeric, underscores, hyphens only
- Username is immutable after creation (enforced by application)
- Display name is optional and can be changed

**Triggers:**
```sql
-- Auto-update updated_at on row modification
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Row-Level Security:**
```sql
-- Users can view all profiles (for search)
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

-- Users can only create/update their own profile
CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.3 habits

**Purpose:** Habit definitions created by users

**Schema:**
```sql
CREATE TABLE public.habits (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  archived boolean DEFAULT false
);

-- Indexes
CREATE INDEX habits_user_id_idx ON habits(user_id);
CREATE INDEX habits_archived_idx ON habits(archived);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigserial | PK | Auto-incrementing habit ID |
| user_id | uuid | FK → auth.users(id), NOT NULL | Habit owner |
| name | text | NOT NULL | Habit name (e.g., "Exercise") |
| description | text | NULL | Optional description |
| created_at | timestamptz | DEFAULT now() | Habit creation time |
| archived | boolean | DEFAULT false | Soft delete flag |

**Business Rules:**
- Habit name is required (validated by API)
- Habits are soft-deleted (archived = true) instead of hard-deleted
- Each user can have unlimited habits
- Habit names do not need to be unique (per user or globally)

**Row-Level Security:**
```sql
-- Users can only see their own habits
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create habits for themselves
CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own habits
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own habits
CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 2.4 habit_logs

**Purpose:** Individual habit completion logs (check-ins)

**Schema:**
```sql
CREATE TABLE public.habit_logs (
  id bigserial PRIMARY KEY,
  habit_id bigint NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  value integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (habit_id, date)
);

-- Indexes
CREATE INDEX habit_logs_habit_id_idx ON habit_logs(habit_id);
CREATE INDEX habit_logs_user_id_idx ON habit_logs(user_id);
CREATE INDEX habit_logs_date_idx ON habit_logs(date);
CREATE UNIQUE INDEX habit_logs_habit_id_date_key ON habit_logs(habit_id, date);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigserial | PK | Auto-incrementing log ID |
| habit_id | bigint | FK → habits(id), NOT NULL | Habit being logged |
| user_id | uuid | FK → auth.users(id), NOT NULL | User who logged |
| date | date | NOT NULL | Date of completion (YYYY-MM-DD) |
| value | integer | NOT NULL, DEFAULT 1 | Completion value (1 = done) |
| created_at | timestamptz | DEFAULT now() | Log creation timestamp |

**Unique Constraint:**
```sql
UNIQUE (habit_id, date)
```
- Prevents duplicate logs for the same habit on the same day
- API uses `UPSERT` to handle duplicate attempts gracefully

**Business Rules:**
- Each habit can have at most one log per day
- Value is typically 1 (done) but could support counts in future
- Logs are immutable after creation (no updates, only delete)
- Deleting a habit cascades to delete all its logs

**Row-Level Security:**
```sql
-- Users can only see their own logs
CREATE POLICY "Users can view own logs"
  ON habit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create logs for their own habits
CREATE POLICY "Users can create own logs"
  ON habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own logs
CREATE POLICY "Users can delete own logs"
  ON habit_logs FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 2.5 habit_stats

**Purpose:** Precomputed statistics for habits (streaks, totals)

**Schema:**
```sql
CREATE TABLE public.habit_stats (
  habit_id bigint REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  total_completions integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completed_date date,
  PRIMARY KEY (habit_id, user_id)
);

-- Indexes
CREATE INDEX habit_stats_user_id_idx ON habit_stats(user_id);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| habit_id | bigint | FK → habits(id), PK | Habit ID |
| user_id | uuid | FK → auth.users(id), PK | User ID |
| total_completions | integer | NOT NULL, DEFAULT 0 | Total times completed |
| current_streak | integer | NOT NULL, DEFAULT 0 | Current consecutive days |
| longest_streak | integer | NOT NULL, DEFAULT 0 | Longest consecutive days |
| last_completed_date | date | NULL | Most recent completion date |

**Composite Primary Key:**
```sql
PRIMARY KEY (habit_id, user_id)
```
- Ensures one stats row per habit per user
- Supports future multi-user habits (not currently used)

**Business Rules:**
- Statistics are computed asynchronously by analytics service
- Updated when `habit.completed` events are consumed from RabbitMQ
- Current streak calculated from consecutive completion dates
- Longest streak tracks historical maximum

**Streak Calculation Algorithm:**
```javascript
// Current Streak
1. Get all logs for habit, ordered by date DESC
2. Start from last_completed_date or today
3. Count consecutive days backwards
4. Stop when gap > 1 day found

// Longest Streak
1. Get all logs for habit, ordered by date ASC
2. Iterate through logs
3. Track current consecutive count
4. Update max when streak breaks
5. Return max
```

**Row-Level Security:**
```sql
-- Users can only see their own stats
CREATE POLICY "Users can view own stats"
  ON habit_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Analytics service uses service role (bypasses RLS)
```

---

### 2.6 friends

**Purpose:** Friend relationships with request/acceptance flow

**Schema:**
```sql
CREATE TABLE public.friends (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

-- Indexes
CREATE INDEX friends_user_id_idx ON friends(user_id);
CREATE INDEX friends_friend_id_idx ON friends(friend_id);
CREATE INDEX friends_status_idx ON friends(status);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | uuid | FK → auth.users(id), PK | Request sender |
| friend_id | uuid | FK → auth.users(id), PK | Request receiver |
| status | text | NOT NULL, CHECK constraint | Request status |
| created_at | timestamptz | DEFAULT now() | Request creation time |
| updated_at | timestamptz | DEFAULT now() | Last status change time |

**Composite Primary Key:**
```sql
PRIMARY KEY (user_id, friend_id)
```
- Ensures one friendship record per user pair (directional)
- Prevents duplicate friend requests

**Status Values:**
- `pending` - Friend request sent, awaiting response
- `accepted` - Friend request accepted (bidirectional friendship created)
- `rejected` - Friend request rejected

**Business Rules:**
- Friendships are directional (user_id → friend_id)
- When accepted, a reciprocal record is created (friend_id → user_id)
- Users cannot send friend requests to themselves (enforced by API)
- Duplicate requests are prevented by primary key constraint

**Triggers:**
```sql
-- Auto-update updated_at on status change
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON friends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Row-Level Security:**
```sql
-- Users can see friendships where they are either party
CREATE POLICY "Users can view own friendships"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can only create friend requests as sender
CREATE POLICY "Users can create friend requests"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete friendships they initiated
CREATE POLICY "Users can delete own friend requests"
  ON friends FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 3. Database Functions and Triggers

### 3.1 update_updated_at_column()

**Purpose:** Automatically update `updated_at` timestamp on row modification

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to:**
- `user_profiles`
- `friends`

**Usage:**
```sql
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Indexes

### 4.1 Primary Key Indexes (Automatic)
- `user_profiles(user_id)`
- `habits(id)`
- `habit_logs(id)`
- `habit_stats(habit_id, user_id)`
- `friends(user_id, friend_id)`

### 4.2 Unique Indexes
- `user_profiles(username)` - Username uniqueness
- `habit_logs(habit_id, date)` - Prevent duplicate logs

### 4.3 Foreign Key Indexes
- `habits(user_id)` - Habit ownership queries
- `habit_logs(habit_id)` - Logs for a habit
- `habit_logs(user_id)` - Logs for a user
- `habit_stats(user_id)` - Stats for a user
- `friends(user_id)` - Friendships sent by user
- `friends(friend_id)` - Friendships received by user

### 4.4 Query Optimization Indexes
- `habits(archived)` - Filter active habits
- `habit_logs(date)` - Date range queries
- `friends(status)` - Filter by friendship status

---

## 5. Data Integrity Constraints

### 5.1 Foreign Key Constraints

**Cascading Deletes:**
```sql
-- Deleting a user cascades to all related data
user_profiles.user_id → auth.users(id) ON DELETE CASCADE
habits.user_id → auth.users(id) ON DELETE CASCADE
habit_logs.user_id → auth.users(id) ON DELETE CASCADE
habit_stats.user_id → auth.users(id) ON DELETE CASCADE
friends.user_id → auth.users(id) ON DELETE CASCADE
friends.friend_id → auth.users(id) ON DELETE CASCADE

-- Deleting a habit cascades to logs and stats
habit_logs.habit_id → habits(id) ON DELETE CASCADE
habit_stats.habit_id → habits(id) ON DELETE CASCADE
```

**Benefits:**
- Automatic cleanup of orphaned records
- Referential integrity maintained
- No manual cleanup required

### 5.2 Check Constraints

**friends.status:**
```sql
CHECK (status IN ('pending', 'accepted', 'rejected'))
```
- Ensures only valid status values
- Prevents typos or invalid states

### 5.3 NOT NULL Constraints

**Critical fields that must always have values:**
- `user_profiles.username`
- `habits.user_id`, `habits.name`
- `habit_logs.habit_id`, `habit_logs.user_id`, `habit_logs.date`, `habit_logs.value`
- `habit_stats.total_completions`, `habit_stats.current_streak`, `habit_stats.longest_streak`
- `friends.status`

---

## 6. Row-Level Security (RLS)

### 6.1 RLS Overview

**Purpose:** Enforce data isolation at the database level

**Benefits:**
- Defense in depth (even if API authorization fails)
- Automatic query filtering
- No data leakage via SQL injection
- Simplified application code

**How it works:**
1. User authenticates with Supabase Auth
2. Supabase issues JWT with `sub` claim (user_id)
3. Backend uses service role key (bypasses RLS)
4. Backend queries include `WHERE user_id = req.user.id`
5. RLS policies provide additional safety net

### 6.2 RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **user_profiles** | All users | Own only | Own only | Own only |
| **habits** | Own only | Own only | Own only | Own only |
| **habit_logs** | Own only | Own only | N/A | Own only |
| **habit_stats** | Own only | Service role | Service role | N/A |
| **friends** | Both parties | Sender only | N/A | Sender only |

**Notes:**
- "Own only" = `auth.uid() = user_id`
- "Both parties" = `auth.uid() = user_id OR auth.uid() = friend_id`
- "Service role" = Analytics service bypasses RLS

---

## 7. Sample Queries

### 7.1 Get User's Active Habits
```sql
SELECT id, name, description, created_at
FROM habits
WHERE user_id = 'user-uuid'
  AND archived = false
ORDER BY created_at DESC;
```

### 7.2 Get Habit Completion Logs (Last 30 Days)
```sql
SELECT date, value
FROM habit_logs
WHERE habit_id = 123
  AND user_id = 'user-uuid'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### 7.3 Get Habit Statistics
```sql
SELECT 
  h.id,
  h.name,
  hs.total_completions,
  hs.current_streak,
  hs.longest_streak,
  hs.last_completed_date
FROM habits h
LEFT JOIN habit_stats hs ON h.id = hs.habit_id AND h.user_id = hs.user_id
WHERE h.user_id = 'user-uuid'
  AND h.archived = false
ORDER BY h.created_at DESC;
```

### 7.4 Get Friend Leaderboard
```sql
SELECT 
  up.username,
  up.display_name,
  SUM(hs.total_completions) as total_completions
FROM friends f
JOIN user_profiles up ON f.friend_id = up.user_id
LEFT JOIN habit_stats hs ON f.friend_id = hs.user_id
WHERE f.user_id = 'user-uuid'
  AND f.status = 'accepted'
GROUP BY up.user_id, up.username, up.display_name
ORDER BY total_completions DESC
LIMIT 10;
```

### 7.5 Search Users by Username
```sql
SELECT user_id, username, display_name
FROM user_profiles
WHERE username ILIKE '%search%'
  AND user_id != 'current-user-uuid'
ORDER BY username
LIMIT 20;
```

---

## 8. Database Migrations

### 8.1 Initial Schema Creation

**Executed in Supabase SQL Editor:**
```sql
-- 1. Create user_profiles table
-- 2. Create habits table
-- 3. Create habit_logs table
-- 4. Create habit_stats table
-- 5. Create friends table
-- 6. Create indexes
-- 7. Create RLS policies
-- 8. Create triggers
```

### 8.2 Migration: Add Username and Friend Requests

**File:** `user-service/migrations/001_add_username_and_friend_requests.sql`

**Changes:**
- Added `username` and `display_name` to `user_profiles`
- Created `friends` table
- Added RLS policies for new tables
- Created `update_updated_at_column()` trigger function

---

## 9. Database Diagram

See `diagrams/erd.png` for the Entity Relationship Diagram showing:

- All tables and their columns
- Primary keys (PK)
- Foreign keys (FK)
- Relationships (1:1, 1:N, M:N)
- Unique constraints
- Indexes

---

## Conclusion

The Habit Tracker database schema demonstrates:

✅ **Normalized Design** - No data redundancy, proper relationships  
✅ **Referential Integrity** - Foreign keys with cascading deletes  
✅ **Data Validation** - Check constraints and NOT NULL constraints  
✅ **Performance Optimization** - Strategic indexes on query columns  
✅ **Security** - Row-Level Security policies for data isolation  
✅ **Audit Trail** - Timestamps on all tables  
✅ **Scalability** - Efficient queries with proper indexing  

This schema supports all application features while maintaining data integrity, security, and performance.

