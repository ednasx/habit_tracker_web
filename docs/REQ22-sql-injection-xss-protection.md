# REQ22 – SQL injection and XSS protection

## SQL injection protections

### No raw SQL in application code
Backend services (habit-service, user-service, analytics-service) interact with the database through the **Supabase client** (`@supabase/supabase-js`). Queries are expressed via a structured API (e.g. `.from(...).select(...).eq(...).in(...)`) rather than string-concatenated SQL, which reduces SQL injection risk.

### Input validation
Where IDs are accepted from the client, the services validate inputs (e.g., UUID validation for user IDs, numeric checks for habit IDs). This prevents malformed identifiers from being used in database calls.

### Authorization boundary
All protected endpoints require a **Supabase JWT** (`Authorization: Bearer <token>`) verified by middleware (`requireAuth`). This ensures requests are tied to an authenticated user identity.

### Database-side access control (recommended/expected)
Supabase supports Row Level Security (RLS). With RLS policies enabled, even if a client tries to query data they do not own, the database will deny it. This is a strong additional layer beyond application logic.

## XSS protections

### React default escaping
The frontend is a React SPA. React escapes inserted values by default, which protects against many reflected/stored XSS scenarios as long as we do not render untrusted HTML directly.

### Avoid `dangerouslySetInnerHTML`
We do not rely on `dangerouslySetInnerHTML` for user-generated content. If it becomes necessary in the future, HTML must be sanitized first (e.g., DOMPurify).

### Security headers
Backend services use `helmet()` which sets multiple HTTP security headers that reduce XSS risk (e.g., by controlling framing and content sniffing). CSP can also be added if needed.

### Practical guidance
- Treat all user-controlled fields (habit names, usernames, display names) as untrusted.
- Render them as text (default React behavior).
- If any feature requires rich text/HTML, sanitize before rendering.
