# REQ26 – Data privacy implementation

## Data minimization in schema/design
- `user_profiles`: stores username + optional display name only.
- `habits`: stores habit name/description (user controlled).
- `habit_logs`: stores (user_id, habit_id, date, value) for tracking.
- `habit_stats`: stores aggregated totals and streaks (derived).
- `friends`: stores friendship relations and status.

## Access control
- Backend endpoints require JWT (`requireAuth`) and use the authenticated user id.
- Database-side RLS policies should be enabled (recommended) to ensure users can only access their rows.

## Secrets management
- Supabase service role key is never exposed to the frontend.
- Kubernetes Secrets / env vars provide server-side secrets at runtime.
- `.env.example` exists for local development without committing real secrets.

## Logging considerations
- Avoid logging tokens or secrets.
- Log only high-level identifiers when needed for debugging.

## Consent and user control
- Users control what they type into habit name/description (privacy notice recommended in UI).
- Friend relationships require explicit user action (request/accept/remove).

## Optional hardening (future)
- Add content security policy (CSP) headers.
- Add a “delete account” flow.
- Add export endpoint for portability.
