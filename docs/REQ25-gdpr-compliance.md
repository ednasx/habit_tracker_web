# REQ25 – GDPR compliance documentation

## Roles
- Data Controller: Project team responsible for this application within the course context
- Data Processor: Supabase (managed DB/auth hosting), Kubernetes hosting provider (if applicable)

## Personal data processed
- Supabase Auth identifiers (user id, email if used by auth)
- User profile data: username, optional display name
- Social graph: friend relationships
- Habit content: habit name/description (may contain personal info if user enters it)
- Habit activity: completion logs and derived statistics (streaks, totals)

## Purpose & lawful basis
Purpose:
- Provide habit tracking features, friend leaderboard, and analytics.

Lawful basis (typical for this kind of app):
- Consent and contract-like necessity for providing the habit-tracking service to the registered user, in line with the course GDPR guidance.

## Data minimization
- Only store what is needed for core features (profiles, habits, logs, friend links, aggregated stats).
- Avoid collecting unnecessary identifiers.

## Storage limitation / retention
- Data is retained as long as the account exists (or as required for course operation).
- Users can delete individual habits via the UI. Account/profile deletion is currently handled manually by an administrator via Supabase Auth (self-service account deletion not yet implemented).

## User rights (how they are supported)
- Right of access: user can view their profile/habits through the UI/API.
- Right to rectification: user can update profile and habits.
- Right to erasure: user can delete individual habits via the UI. Full account/profile deletion currently requires manual/admin action via Supabase Auth and is therefore a known limitation/gap; implementing self-service account deletion is required for full GDPR compliance.
- Right to data portability: export can be provided by querying user data (documented as a support process).

## Security measures (summary)
- Authentication via Supabase JWT
- Authorization checks per user
- Secrets kept out of frontend; service-role keys used only server-side
- TLS via Let’s Encrypt + cert-manager
- Monitoring for operational issues (Prometheus/Grafana)
