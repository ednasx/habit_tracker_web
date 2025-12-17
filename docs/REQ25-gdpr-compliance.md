# REQ25 – GDPR compliance documentation

## Roles
- Data Controller: (project team / course context) <!-- fill if required -->
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
- Consent / contract-like necessity for providing the service to the user. <!-- align with your course wording -->

## Data minimization
- Only store what is needed for core features (profiles, habits, logs, friend links, aggregated stats).
- Avoid collecting unnecessary identifiers.

## Storage limitation / retention
- Data is retained as long as the account exists (or as required for course operation).
- Users should be able to delete habits and (optionally) delete their account/profile data. <!-- describe current capabilities -->

## User rights (how they are supported)
- Right of access: user can view their profile/habits through the UI/API.
- Right to rectification: user can update profile and habits.
- Right to erasure: user can delete habits; account deletion depends on Supabase auth process (manual/admin if not implemented).
- Right to data portability: export can be provided by querying user data (documented as a support process).

## Security measures (summary)
- Authentication via Supabase JWT
- Authorization checks per user
- Secrets kept out of frontend; service-role keys used only server-side
- TLS via Let’s Encrypt + cert-manager
- Monitoring for operational issues (Prometheus/Grafana)
