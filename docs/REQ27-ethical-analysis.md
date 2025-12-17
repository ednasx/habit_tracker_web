# REQ27 – Ethical analysis

## Context
This system supports habit tracking with social features (friends/leaderboard) and analytics (streaks, totals).

## Potential ethical risks
### Privacy risks
Habit content and completion patterns can reveal sensitive personal routines (health, religion, work schedule) depending on what users track.

### Social pressure & wellbeing
Leaderboards can motivate but may also create unhealthy competition, guilt, or stress for users who fall behind.

### Misuse of data
Even without “sensitive data” fields, combined behavioral logs + social graph can be used to infer personal attributes.

### Bias/fairness
Users with more time/resources may dominate leaderboards, which could discourage others and amplify inequities.

## Mitigations in this project
- Data minimization: only core fields stored.
- Authentication and access control: JWT-protected APIs; (recommended) RLS.
- Ability to delete habits (reduces retained personal info).
- Aggregation: leaderboard uses totals/streaks, not raw logs per day for friends.
- UX messaging can emphasize personal progress, not only rank.

## Recommended improvements
- Provide privacy notice in the UI explaining what is stored and why.
- Add “private mode” (exclude user from leaderboard).
- Add “opt-in” for social features.
- Add account deletion + export.
- Rate-limit completion logging to reduce gaming/abuse.
