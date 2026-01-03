# Security Model and Request Flow

This diagram shows the security layers and request flow for authenticated API requests.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Ingress as Nginx Ingress<br/>(TLS Termination)
    participant Service as Habit/User Service
    participant Auth as JWT Verification
    participant DB as Supabase<br/>(PostgreSQL + RLS)

    Note over User,DB: 1. Authentication Flow
    User->>Browser: Enter credentials
    Browser->>Ingress: POST /auth/login (HTTPS)
    Ingress->>Service: Forward (HTTP)
    Service->>DB: Verify credentials (Supabase Auth)
    DB-->>Service: Return JWT token
    Service-->>Ingress: 200 OK + JWT
    Ingress-->>Browser: Response (HTTPS)
    Browser->>Browser: Store JWT in memory

    Note over User,DB: 2. Authenticated API Request
    User->>Browser: Click "Mark Done"
    Browser->>Ingress: POST /api/habits/123/logs<br/>Authorization: Bearer {JWT}<br/>(HTTPS encrypted)
    
    Note over Ingress: 🔒 Layer 1: TLS/HTTPS<br/>Certificate from Let's Encrypt
    Ingress->>Service: Forward request (HTTP)<br/>Authorization: Bearer {JWT}
    
    Note over Service,Auth: 🔑 Layer 2: JWT Authentication<br/>requireAuth middleware
    Service->>Auth: Verify JWT signature
    Auth->>Auth: Check expiration
    Auth->>Auth: Extract user_id from 'sub' claim
    Auth-->>Service: req.user = { id: user_id }
    
    Note over Service: ✅ Layer 3: API Authorization<br/>Filter by req.user.id
    Service->>Service: Validate input<br/>(habitId, date, value)
    
    Note over Service: 🛡️ Layer 4: Input Validation<br/>Prevent SQL injection & XSS
    Service->>DB: INSERT INTO habit_logs<br/>WHERE user_id = req.user.id<br/>(Parameterized query)
    
    Note over DB: 🔐 Layer 5: Row-Level Security<br/>Database-level authorization
    DB->>DB: Check RLS policy:<br/>auth.uid() = user_id
    DB->>DB: Execute query
    DB-->>Service: Return log record
    
    Service-->>Ingress: 201 Created + JSON
    Ingress-->>Browser: Response (HTTPS encrypted)
    Browser-->>User: Show success message

    Note over User,DB: 3. Unauthorized Request (No JWT)
    User->>Browser: Try to access API
    Browser->>Ingress: GET /api/habits<br/>(No Authorization header)
    Ingress->>Service: Forward request
    Service->>Auth: Verify JWT
    Auth-->>Service: ❌ No token found
    Service-->>Ingress: 401 Unauthorized
    Ingress-->>Browser: 401 Unauthorized
    Browser-->>User: Redirect to login
```

## Security Layers

### Layer 1: TLS/HTTPS Encryption
- **Technology:** cert-manager + Let's Encrypt
- **What it protects:** All data in transit
- **Location:** Nginx Ingress (TLS termination)

### Layer 2: JWT Authentication
- **Technology:** Supabase Auth + jsonwebtoken
- **What it protects:** Ensures user identity
- **Middleware:** `requireAuth` in `auth/authMiddleware.js`

### Layer 3: API Authorization
- **Implementation:** User ID extracted from JWT
- **What it protects:** Queries filtered by `req.user.id`
- **Example:** `WHERE user_id = req.user.id`

### Layer 4: Input Validation
- **Protection against:**
  - SQL Injection (parameterized queries)
  - XSS (React auto-escaping, Helmet.js headers)
  - Invalid data (server-side validation)

### Layer 5: Row-Level Security (RLS)
- **Technology:** PostgreSQL RLS policies
- **What it protects:** Defense in depth at database level
- **Example:** `USING (auth.uid() = user_id)`

## Security Best Practices Implemented

✅ **HTTPS Everywhere** - All external traffic encrypted  
✅ **JWT Authentication** - Stateless, scalable authentication  
✅ **Row-Level Security** - Database-level authorization  
✅ **Input Validation** - Server-side validation of all inputs  
✅ **SQL Injection Protection** - Parameterized queries only  
✅ **XSS Protection** - React auto-escaping + Helmet.js  
✅ **Secrets Management** - No secrets in Git  
✅ **Defense in Depth** - Multiple security layers  

## Request Flow Summary

1. **User authenticates** → Receives JWT token
2. **Browser includes JWT** in Authorization header (HTTPS)
3. **Nginx Ingress terminates TLS** → Forwards to service (HTTP internal)
4. **Service verifies JWT** → Extracts user_id
5. **Service validates input** → Prevents injection attacks
6. **Database checks RLS** → Ensures data isolation
7. **Response encrypted** → Returns via HTTPS to browser

