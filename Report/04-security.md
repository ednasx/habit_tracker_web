# Security Model and Request Flow

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## Overview

The Habit Tracker implements a **defense-in-depth security model** with multiple layers:

1. **TLS/HTTPS Encryption** - All traffic encrypted in transit
2. **JWT Authentication** - Token-based user authentication
3. **Row-Level Security (RLS)** - Database-level authorization
4. **Input Validation** - Server-side validation of all inputs
5. **Secrets Management** - Secure storage of credentials
6. **Security Headers** - HTTP security headers (Helmet.js)

---

## 1. TLS/HTTPS Configuration

### 1.1 Certificate Management

**Technology:** cert-manager + Let's Encrypt

**ClusterIssuer Configuration:**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: edbertwu123@gmail.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

**Certificate Lifecycle:**
1. cert-manager monitors Ingress resources with TLS annotations
2. Detects `cert-manager.io/cluster-issuer: letsencrypt-prod` annotation
3. Initiates ACME HTTP-01 challenge with Let's Encrypt
4. Let's Encrypt verifies domain ownership
5. Certificate issued and stored in Kubernetes Secret (`habit-tls`)
6. Ingress controller uses certificate for TLS termination
7. cert-manager automatically renews certificate before expiration (90 days)

### 1.2 Ingress TLS Configuration

**Ingress Resource:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: habit-tracker-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - habit-tracker.ltu-m7011e-8.se
      secretName: habit-tls
  rules:
    - host: habit-tracker.ltu-m7011e-8.se
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: habit-frontend
                port:
                  number: 80
```

**TLS Termination:**
- TLS is terminated at the Ingress controller (Nginx)
- Internal cluster traffic uses HTTP (within trusted network)
- External traffic (internet → cluster) uses HTTPS

**Certificate Details:**
- **Issuer:** Let's Encrypt (trusted by all browsers)
- **Validity:** 90 days (auto-renewed at 60 days)
- **Algorithm:** RSA 2048-bit or ECDSA P-256
- **Protocol:** TLS 1.2 and TLS 1.3

---

## 2. Authentication Flow

### 2.1 User Registration

```
1. User fills registration form (email, password)
   ↓
2. Frontend → Supabase Auth (signUp)
   ↓
3. Supabase creates user in auth.users table
   ↓
4. Supabase sends verification email (optional)
   ↓
5. Supabase returns JWT access token + refresh token
   ↓
6. Frontend stores tokens in memory (React state)
   ↓
7. Frontend redirects to username setup page
   ↓
8. User creates profile (username, display name)
   ↓
9. Frontend → POST /api/users/profile (with JWT)
   ↓
10. User Service verifies JWT and creates profile
```

**Security Considerations:**
- Password hashed by Supabase (bcrypt)
- Minimum password length enforced (Supabase policy)
- Email verification can be enabled (optional)
- Tokens stored in memory (not localStorage - XSS protection)

### 2.2 User Login

```
1. User enters email and password
   ↓
2. Frontend → Supabase Auth (signInWithPassword)
   ↓
3. Supabase verifies credentials
   ↓
4. Supabase returns JWT access token + refresh token
   ↓
5. Frontend stores tokens in memory
   ↓
6. Frontend fetches user profile
   ↓
7. Frontend → GET /api/users/profile (with JWT)
   ↓
8. User Service verifies JWT and returns profile
   ↓
9. User redirected to dashboard
```

### 2.3 JWT Structure

**Access Token (JWT):**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",           // User ID
    "email": "user@example.com",
    "aud": "authenticated",
    "role": "authenticated",
    "iat": 1704067200,            // Issued at
    "exp": 1704070800             // Expires (1 hour)
  },
  "signature": "..."
}
```

**Token Verification:**
- Backend services verify signature using `SUPABASE_JWT_SECRET`
- Checks expiration time (`exp` claim)
- Extracts user ID from `sub` claim
- Attaches `req.user = { id: sub }` for downstream handlers

**Token Expiration:**
- Access token: 1 hour
- Refresh token: 30 days
- Frontend automatically refreshes access token when expired

---

## 3. Authorization Model

### 3.1 API-Level Authorization

**Middleware:** `requireAuth` (in `auth/authMiddleware.js`)

**Process:**
```javascript
1. Extract Authorization header: "Bearer <token>"
2. Verify JWT signature using SUPABASE_JWT_SECRET
3. Check token expiration
4. Extract user ID from sub claim
5. Attach req.user = { id: userId }
6. Call next() to proceed to route handler
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `401 Unauthorized` - Token expired
- `403 Forbidden` - Valid token but insufficient permissions

**Protected Endpoints:**
- All `/api/habits/*` endpoints require authentication
- All `/api/users/*` endpoints (except health checks) require authentication
- `/api/leaderboard/*` endpoints require authentication

### 3.2 Database-Level Authorization (RLS)

**Row-Level Security Policies:**

#### habits Table
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

#### habit_logs Table
```sql
-- Users can only see their own habit logs
CREATE POLICY "Users can view own logs"
ON habit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create logs for their own habits
CREATE POLICY "Users can create own logs"
ON habit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own logs
CREATE POLICY "Users can update own logs"
ON habit_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own logs
CREATE POLICY "Users can delete own logs"
ON habit_logs FOR DELETE
USING (auth.uid() = user_id);
```

#### friends Table
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

#### user_profiles Table
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

**RLS Benefits:**
- **Defense in Depth**: Even if API authorization fails, database blocks unauthorized access
- **Automatic Filtering**: Queries automatically filtered by user_id
- **No Data Leakage**: Impossible to access other users' data via SQL injection

### 3.3 Service-Role Access

**Backend Services Use Service Role:**
- Services connect with `SUPABASE_SERVICE_ROLE_KEY`
- Service role **bypasses RLS policies**
- Services must implement authorization logic in code

**Why Service Role?**
- Backend needs to query across users (e.g., leaderboard)
- Backend needs to update analytics tables
- Backend performs operations not tied to a specific user

**Security Measures:**
- Service role key stored in Kubernetes Secret
- Never exposed to frontend
- Backend always filters by `req.user.id` from JWT

---

## 4. Secure Request Flow

### 4.1 Authenticated API Request Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. HTTPS Request
     │    GET /api/habits
     │    Authorization: Bearer <JWT>
     ↓
┌─────────────────┐
│ Nginx Ingress   │
│ (TLS Terminate) │
└────┬────────────┘
     │ 2. HTTP Request (internal)
     │    Authorization: Bearer <JWT>
     ↓
┌──────────────────┐
│ Habit Service    │
│ (requireAuth)    │
└────┬─────────────┘
     │ 3. Verify JWT signature
     │    Extract user_id from sub claim
     │    Attach req.user = { id: user_id }
     ↓
┌──────────────────┐
│ Route Handler    │
│ (habitsRoutes)   │
└────┬─────────────┘
     │ 4. Query database
     │    SELECT * FROM habits
     │    WHERE user_id = req.user.id
     ↓
┌──────────────────┐
│ Supabase         │
│ (Service Role)   │
└────┬─────────────┘
     │ 5. Execute query (RLS bypassed)
     │    Return results
     ↓
┌──────────────────┐
│ Route Handler    │
└────┬─────────────┘
     │ 6. JSON Response
     │    200 OK
     │    [{ id: 1, name: "Exercise", ... }]
     ↓
┌─────────────────┐
│ Nginx Ingress   │
└────┬────────────┘
     │ 7. HTTPS Response (encrypted)
     ↓
┌─────────┐
│ Browser │
└─────────┘
```

### 4.2 Unauthorized Request Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. HTTPS Request (no token)
     │    GET /api/habits
     ↓
┌─────────────────┐
│ Nginx Ingress   │
└────┬────────────┘
     │ 2. HTTP Request
     ↓
┌──────────────────┐
│ Habit Service    │
│ (requireAuth)    │
└────┬─────────────┘
     │ 3. No Authorization header
     │    ❌ Return 401 Unauthorized
     ↓
┌─────────────────┐
│ Nginx Ingress   │
└────┬────────────┘
     │ 4. HTTPS Response
     │    401 Unauthorized
     ↓
┌─────────┐
│ Browser │
└─────────┘
```

### 4.3 Friend Leaderboard Request Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. GET /api/leaderboard/friends
     │    Authorization: Bearer <JWT>
     ↓
┌──────────────────┐
│ Habit Service    │
│ (requireAuth)    │
└────┬─────────────┘
     │ 2. Verify JWT → user_id = "user-123"
     ↓
┌──────────────────┐
│ Leaderboard      │
│ Service          │
└────┬─────────────┘
     │ 3. Query friends table
     │    SELECT friend_id FROM friends
     │    WHERE user_id = "user-123"
     │    AND status = "accepted"
     │    → ["user-456", "user-789"]
     ↓
     │ 4. Query habit_stats for friends
     │    SELECT user_id, SUM(total_completions)
     │    FROM habit_stats
     │    WHERE user_id IN ("user-456", "user-789")
     │    GROUP BY user_id
     ↓
     │ 5. Join with user_profiles
     │    Get usernames and display names
     ↓
     │ 6. Sort by total completions
     │    Return ranked list
     ↓
┌─────────┐
│ Browser │
│ (Shows  │
│ only    │
│ friends)│
└─────────┘
```

**Security:**
- User can only see leaderboard for their accepted friends
- Cannot query arbitrary users' statistics
- Friend relationships verified at database level

---

## 5. Input Validation and Sanitization

### 5.1 Backend Validation

**Habit Creation:**
```javascript
// Validate habit name
if (!name || typeof name !== 'string' || name.trim().length === 0) {
  return res.status(400).json({ message: 'Habit name is required' })
}

// Sanitize input
const sanitizedName = name.trim()
```

**Username Validation:**
```javascript
// Username format validation
const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/

if (!USERNAME_REGEX.test(username)) {
  return res.status(400).json({ 
    message: 'Username must be 3-20 characters, lowercase alphanumeric, underscores, or hyphens' 
  })
}

// Check uniqueness
const { data: existing } = await supabase
  .from('user_profiles')
  .select('user_id')
  .eq('username', username)
  .single()

if (existing) {
  return res.status(409).json({ message: 'Username already taken' })
}
```

**UUID Validation:**
```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!UUID_REGEX.test(friendId)) {
  return res.status(400).json({ message: 'Invalid friend ID format' })
}
```

### 5.2 SQL Injection Protection

**Supabase Client (Parameterized Queries):**
```javascript
// ✅ SAFE - Uses parameterized query
const { data } = await supabase
  .from('habits')
  .select('*')
  .eq('user_id', userId)  // Automatically escaped

// ❌ UNSAFE - Never used in this project
const query = `SELECT * FROM habits WHERE user_id = '${userId}'`
```

**All database queries use Supabase client:**
- Automatically escapes parameters
- Prevents SQL injection attacks
- No raw SQL string concatenation

### 5.3 XSS Protection

**React Automatic Escaping:**
```jsx
// ✅ SAFE - React escapes by default
<h2>{habit.name}</h2>

// ❌ UNSAFE - Never used in this project
<div dangerouslySetInnerHTML={{ __html: habit.name }} />
```

**Backend JSON Responses:**
- All responses are JSON (not HTML)
- No server-side HTML rendering
- Content-Type: application/json

**Security Headers (Helmet.js):**
```javascript
import helmet from 'helmet'

app.use(helmet())  // Sets security headers:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Content-Security-Policy (if configured)
```

---

## 6. Secrets Management

### 6.1 Environment Variables

**Never Committed to Git:**
- `.env` files are in `.gitignore`
- `.env.example` files show required variables (without values)

**Backend Services (.env):**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret
RABBITMQ_URL=amqp://rabbitmq:5672
PORT=4000
NODE_ENV=production
```

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_BASE_URL=/api
```

### 6.2 Kubernetes Secrets

**Creation:**
```bash
kubectl create secret generic supabase-secret \
  --from-literal=SUPABASE_URL=https://xxx.supabase.co \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=xxx \
  --from-literal=SUPABASE_JWT_SECRET=xxx \
  -n habit-dev
```

**Usage in Deployment:**
```yaml
spec:
  containers:
    - name: habit-service
      envFrom:
        - secretRef:
            name: supabase-secret
```

**Security:**
- Secrets encrypted at rest in etcd (Kubernetes)
- Only accessible within the namespace
- Not logged or exposed in pod descriptions

### 6.3 GitHub Secrets

**Used in CI/CD:**
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Encrypted by GitHub:**
- Cannot be read after creation
- Only accessible to workflow runs
- Masked in logs

---

## 7. Security Best Practices Implemented

✅ **HTTPS Everywhere** - All external traffic encrypted  
✅ **JWT Authentication** - Stateless, scalable authentication  
✅ **Row-Level Security** - Database-level authorization  
✅ **Input Validation** - Server-side validation of all inputs  
✅ **SQL Injection Protection** - Parameterized queries only  
✅ **XSS Protection** - React auto-escaping + security headers  
✅ **Secrets Management** - No secrets in Git  
✅ **Principle of Least Privilege** - Services have minimal permissions  
✅ **Defense in Depth** - Multiple security layers  
✅ **Audit Trail** - All changes logged in Git and database  

---

## 8. Security Considerations and Limitations

### 8.1 Current Limitations

⚠️ **Rate Limiting:** Not implemented - vulnerable to brute force attacks  
⚠️ **CORS Configuration:** Currently allows all origins (development)  
⚠️ **Content Security Policy:** Not fully configured  
⚠️ **Dependency Scanning:** No automated vulnerability scanning  
⚠️ **Image Scanning:** Docker images not scanned for vulnerabilities  

### 8.2 Future Enhancements

**Rate Limiting:**
```javascript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // Limit each IP to 100 requests per windowMs
})

app.use('/api/', limiter)
```

**CORS Configuration:**
```javascript
app.use(cors({
  origin: 'https://habit-tracker.ltu-m7011e-8.se',
  credentials: true
}))
```

**Dependency Scanning:**
- GitHub Dependabot (automated PRs for vulnerabilities)
- Snyk or npm audit in CI pipeline

**Image Scanning:**
- Trivy or Clair for Docker image scanning
- Fail CI build if critical vulnerabilities found

---

## Conclusion

The Habit Tracker implements a **comprehensive security model** with:

✅ **Encryption** - TLS/HTTPS for all external traffic  
✅ **Authentication** - JWT-based with Supabase Auth  
✅ **Authorization** - API-level + database-level (RLS)  
✅ **Input Validation** - Server-side validation and sanitization  
✅ **Secrets Management** - Kubernetes Secrets + GitHub Secrets  
✅ **Defense in Depth** - Multiple security layers  

This security architecture follows industry best practices and provides strong protection against common web vulnerabilities (OWASP Top 10).

