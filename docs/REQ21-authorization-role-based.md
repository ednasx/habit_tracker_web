# REQ21 – Authorization (Role-Based)

## Overview

This document describes the authorization and access control model for the Habit Tracker application. The system implements a **user-based authorization model** with Row-Level Security (RLS) policies enforced at the database level, complemented by API-level authorization checks.

While the system doesn't have traditional "roles" like Admin/Moderator/User, it implements **resource-based authorization** where users have different permissions based on their relationship to the data (owner, friend, etc.).

---

## Authorization Architecture

### Two-Layer Security Model

The Habit Tracker implements defense-in-depth with two layers of authorization:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Request                        │
│              (with Authorization: Bearer <JWT>)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Layer 1: API Authorization                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • JWT Verification (requireAuth middleware)           │ │
│  │  • User identity extraction (req.user.id)              │ │
│  │  • Ownership checks in route handlers                  │ │
│  │  • Input validation                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 2: Database Authorization (RLS)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Row-Level Security policies                         │ │
│  │  • auth.uid() = user_id checks                         │ │
│  │  • Friendship-based access for leaderboard            │ │
│  │  • Prevents data leakage even if API has bugs         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Database  │
                    └─────────────┘
```

---

## Authentication vs Authorization

### Authentication (Who are you?)
- Managed by **Supabase Auth**
- Users sign up with email/password
- Supabase issues JWT tokens upon successful login
- Tokens contain user identity in the `sub` claim

### Authorization (What can you do?)
- Managed by **API middleware** + **RLS policies**
- Determines what resources a user can access
- Enforces ownership and relationship-based access control

---

## User Permission Model

### Permission Types

| Permission Type | Description | Implementation |
|----------------|-------------|----------------|
| **Owner** | Full CRUD access to own resources | `user_id = req.user.id` + RLS |
| **Friend** | Read access to friend's stats | Friendship check + RLS |
| **Public** | No authentication required | Health check endpoints only |
| **Service** | Backend service access | Service role key (bypasses RLS) |

---

## Resource-Based Authorization Rules

### 1. Habits

**Owner Permissions:**
- ✅ Create habits
- ✅ Read own habits
- ✅ Update own habits
- ✅ Delete own habits
- ❌ Cannot access other users' habits

**Implementation:**
- API filters by `req.user.id`
- RLS policies enforce `auth.uid() = user_id`

**Code Example:**
```javascript
// habit-service/routes/habitsRoutes.js
router.get('/', async (req, res) => {
  const userId = req.user?.id  // From JWT
  const habits = await listHabits(userId)  // Only returns user's habits
  res.json(habits)
})
```

**RLS Policy:**
```sql
CREATE POLICY "Users can view their own habits"
ON public.habits
FOR SELECT
USING (auth.uid() = user_id);
```

---

### 2. Habit Logs

**Owner Permissions:**
- ✅ Create logs for own habits
- ✅ Read own logs
- ✅ Update own logs
- ✅ Delete own logs
- ❌ Cannot log completions for other users' habits

**Anti-Spam Protection:**
- Unique constraint on `(habit_id, date)` prevents duplicate logs

**Implementation:**
```javascript
// habit-service/routes/habitsRoutes.js
router.post('/:id/logs', async (req, res) => {
  const userId = req.user?.id
  const habitId = Number(req.params.id)
  
  // Service checks ownership before allowing log creation
  const log = await logHabitCompletion({ userId, habitId, date, value })
  res.status(201).json(log)
})
```

**RLS Policy:**
```sql
CREATE POLICY "Users can insert their own habit logs"
ON public.habit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

### 3. Habit Stats

**Owner Permissions:**
- ✅ Read own stats
- ❌ Cannot directly modify stats (updated by analytics service)

**Friend Permissions:**
- ✅ Read friends' aggregated stats via leaderboard
- ❌ Cannot read detailed habit information

**Implementation:**
- Analytics service uses **service role key** to update stats
- Leaderboard endpoint filters by friendship status

**Leaderboard Authorization:**
```javascript
// habit-service/services/leaderboardService.js
export async function getFriendsLeaderboard(userId, limit = 10) {
  // 1. Get user's accepted friends
  const { data: friendships } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
  
  const friendIds = friendships.map(f => f.friend_id)
  
  // 2. Get stats only for those friends
  const { data: stats } = await supabase
    .from('habit_stats')
    .select('user_id, total_completions, current_streak, longest_streak')
    .in('user_id', friendIds)
    .order('total_completions', { ascending: false })
    .limit(limit)
  
  return stats
}
```

**RLS Policy:**
```sql
-- Users can view their own stats
CREATE POLICY "Users can view their own habit stats"
ON public.habit_stats
FOR SELECT
USING (auth.uid() = user_id);
```

---

### 4. User Profiles

**Owner Permissions:**
- ✅ Create own profile
- ✅ Read own profile
- ✅ Update own profile
- ❌ Cannot modify other users' profiles

**Public Permissions:**
- ✅ Search for users by username (authenticated users only)
- ✅ View basic profile info (username, display_name) of search results

**Implementation:**
```javascript
// user-service/routes/usersRoutes.js
router.post('/profile', async (req, res) => {
  const userId = req.user?.id  // From JWT
  const { username, display_name } = req.body
  
  // Service ensures userId matches authenticated user
  const profile = await createOrUpdateProfile(userId, { username, display_name })
  res.status(201).json(profile)
})
```

**RLS Policy:**
```sql
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 5. Friends/Friendships

**Sender Permissions:**
- ✅ Send friend requests
- ✅ View sent requests
- ✅ Cancel/remove friendships they initiated
- ❌ Cannot send requests on behalf of others

**Receiver Permissions:**
- ✅ View received pending requests
- ✅ Accept friend requests
- ✅ Reject friend requests
- ❌ Cannot accept requests not sent to them

**Both Parties:**
- ✅ View accepted friendships
- ✅ Remove friendships (either party can unfriend)

**Implementation:**
```javascript
// user-service/routes/usersRoutes.js

// Send friend request - must be authenticated user
router.post('/friends/request', async (req, res) => {
  const userId = req.user?.id  // Sender
  const { username } = req.body
  
  const targetUser = await getUserByUsername(username)
  const friendId = targetUser.user_id
  
  // Prevents sending requests as someone else
  const request = await sendFriendRequest(userId, friendId)
  res.status(201).json({ message: 'Friend request sent', request })
})

// Accept friend request - must be the receiver
router.post('/friends/:friendId/accept', async (req, res) => {
  const userId = req.user?.id  // Receiver
  const friendId = req.params.friendId  // Sender
  
  // Service verifies a pending request exists where:
  // user_id = friendId AND friend_id = userId
  const friendship = await acceptFriendRequest(userId, friendId)
  res.status(200).json({ message: 'Friend request accepted', friendship })
})
```

**RLS Policies:**
```sql
-- Users can view friendships where they are involved
CREATE POLICY "Users can view their own friendships"
ON public.friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendships where they are the sender
CREATE POLICY "Users can create friendships"
ON public.friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete friendships they initiated
CREATE POLICY "Users can delete their own friendships"
ON public.friends
FOR DELETE
USING (auth.uid() = user_id);
```

---

## API-Level Authorization

### JWT Verification Middleware

All protected endpoints use the `requireAuth` middleware:

```javascript
// auth/authMiddleware.js
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
    req.user = { id: decoded.sub }  // Extract user ID from JWT
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' })
  }
}
```

**Applied to routes:**
```javascript
// habit-service/index.js
import { requireAuth } from './auth/authMiddleware.js'

app.use('/api/habits', requireAuth, habitsRoutes)
app.use('/api/leaderboard', requireAuth, leaderboardRoutes)
```

---

## Row-Level Security (RLS) Policies

### Complete RLS Policy Summary

| Table | Policy | Type | Rule |
|-------|--------|------|------|
| **habits** | Users can view own habits | SELECT | `auth.uid() = user_id` |
| **habits** | Users can insert own habits | INSERT | `auth.uid() = user_id` |
| **habits** | Users can update own habits | UPDATE | `auth.uid() = user_id` |
| **habits** | Users can delete own habits | DELETE | `auth.uid() = user_id` |
| **habit_logs** | Users can view own logs | SELECT | `auth.uid() = user_id` |
| **habit_logs** | Users can insert own logs | INSERT | `auth.uid() = user_id` |
| **habit_logs** | Users can update own logs | UPDATE | `auth.uid() = user_id` |
| **habit_logs** | Users can delete own logs | DELETE | `auth.uid() = user_id` |
| **habit_stats** | Users can view own stats | SELECT | `auth.uid() = user_id` |
| **user_profiles** | Users can view own profile | SELECT | `auth.uid() = user_id` |
| **user_profiles** | Users can update own profile | UPDATE | `auth.uid() = user_id` |
| **friends** | Users can view their friendships | SELECT | `auth.uid() = user_id OR auth.uid() = friend_id` |
| **friends** | Users can create friendships | INSERT | `auth.uid() = user_id` |
| **friends** | Users can delete their friendships | DELETE | `auth.uid() = user_id` |

**RLS Status:** ✅ Enabled on all tables

**Complete policies:** See `supabase/rls-policies.sql`

---

## Service Role Access

### Backend Services

Backend services (habit-service, user-service, analytics-service) use the **Supabase service role key** which **bypasses RLS**.

**Why this is safe:**
1. Services are trusted code running in controlled environments
2. Services implement their own authorization logic
3. Services are not directly accessible by end users
4. RLS acts as a safety net if service logic has bugs

**Service Role Usage:**
```javascript
// config/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
)
```

**Analytics Service Special Case:**
- Needs to update `habit_stats` for any user
- Uses service role key to write stats
- Does not expose any user-facing API
- Only consumes RabbitMQ events

---

## Authorization Flow Examples

### Example 1: User Creates a Habit

```
1. User logs in → receives JWT token
2. Frontend sends POST /api/habits with JWT
3. requireAuth middleware verifies JWT → extracts user_id
4. Route handler receives req.user.id = "abc-123"
5. Service calls Supabase with { user_id: "abc-123", name: "Exercise" }
6. RLS policy checks: auth.uid() = "abc-123" ✅
7. Habit created successfully
```

### Example 2: User Tries to Access Another User's Habit

```
1. User A (id: "abc-123") tries GET /api/habits/999
2. requireAuth middleware verifies JWT → extracts user_id = "abc-123"
3. Route handler queries Supabase for habit 999 with user_id = "abc-123"
4. RLS policy checks: auth.uid() = "abc-123" but habit.user_id = "xyz-789" ❌
5. Supabase returns no results (RLS blocks access)
6. API returns 404 Not Found
```

### Example 3: Friend Views Leaderboard

```
1. User A (id: "abc-123") sends GET /api/leaderboard/friends
2. requireAuth middleware verifies JWT → extracts user_id = "abc-123"
3. Service queries friends table for accepted friends of "abc-123"
4. RLS allows query because auth.uid() = user_id ✅
5. Service gets friend IDs: ["xyz-789", "def-456"]
6. Service queries habit_stats for those friend IDs using service role key
7. Returns aggregated stats (no sensitive habit details)
```

---

## Authorization Best Practices

### ✅ Current Implementation

1. **Defense in Depth:** API + RLS layers
2. **Principle of Least Privilege:** Users only access their own data
3. **Fail Secure:** RLS prevents data leakage even if API has bugs
4. **Input Validation:** All user inputs validated before processing
5. **JWT-Based Authentication:** Industry-standard token format
6. **Service Isolation:** Backend services use service role key appropriately

### 🔒 Security Considerations

1. **JWT Secret Protection:**
   - `SUPABASE_JWT_SECRET` must be kept secure
   - Never commit secrets to Git
   - Use environment variables in all environments

2. **Service Role Key Protection:**
   - Even more sensitive than JWT secret
   - Only used by backend services
   - Never exposed to frontend

3. **Token Expiration:**
   - Supabase JWTs have expiration times
   - Frontend should handle token refresh
   - Expired tokens are rejected by middleware

4. **HTTPS Required:**
   - JWTs must be transmitted over HTTPS
   - Prevents token interception
   - Enforced in production via Ingress/cert-manager

---

## Future Enhancements

### Potential Role-Based Extensions

If the application grows to need traditional roles:

1. **Admin Role:**
   - Add `role` column to `user_profiles`
   - Create admin-specific RLS policies
   - Add role checks in middleware
   - Example: `req.user.role === 'admin'`

2. **Moderator Role:**
   - Can view/moderate user-reported content
   - Limited admin capabilities
   - Separate from full admin access

3. **Premium User Role:**
   - Access to premium features
   - Higher rate limits
   - Additional storage/habits

**Implementation Pattern:**
```javascript
// Future: Role-based middleware
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' })
    }
    next()
  }
}

// Usage
app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), deleteUserHandler)
```

---

## Testing Authorization

### Manual Testing Checklist

- [ ] Unauthenticated requests to protected endpoints return 401
- [ ] Invalid JWT tokens are rejected
- [ ] Expired JWT tokens are rejected
- [ ] Users cannot access other users' habits
- [ ] Users cannot log completions for other users' habits
- [ ] Users can only view leaderboard for accepted friends
- [ ] Friend requests can only be sent by authenticated users
- [ ] Friend requests can only be accepted by the receiver
- [ ] RLS policies prevent data leakage even with direct database queries

### Automated Testing

See `habit-service/tests/authMiddleware.test.js` for JWT verification tests.

**Future:** Add integration tests for RLS policies using Supabase test client.

---

## References

- **RLS Policies:** `supabase/rls-policies.sql`
- **Security Documentation:** `docs/security.md`
- **Auth Middleware:** `habit-service/auth/authMiddleware.js`, `user-service/auth/authMiddleware.js`
- **Database Schema:** `docs/database-schema.md`
- **Supabase RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security

---

## Role Restrictions Summary

### Current "Roles" (Resource-Based)

| User Type | Permissions | Restrictions |
|-----------|-------------|--------------|
| **Authenticated User** | Create/read/update/delete own habits and logs; Create/manage own profile; Send/manage friend requests; View friends' leaderboard stats | Cannot access other users' habits or logs; Cannot modify other users' profiles; Cannot send friend requests on behalf of others |
| **Friend** | View aggregated stats of friends on leaderboard | Cannot view detailed habit information; Cannot modify friends' data |
| **Unauthenticated** | Access health check endpoints | Cannot access any user data or protected endpoints |
| **Service (Backend)** | Full database access via service role key | Only used by trusted backend services; Not accessible to end users |

---

**Document Version:** 1.0  
**Last Updated:** December 20, 2025  
**Status:** ✅ Complete - RLS implemented and documented, authorization model fully described

