# REQ19 – Traffic generation script

We use **k6** to generate HTTP traffic against the deployed Habit Tracker system.

## Script location
- `infra/loadtest/k6/habit-tracker.js`

## What it tests
- `GET /api/health` (no auth)
- `GET /api/habits` (auth)
- `POST /api/habits/:id/logs` (auth)
- `GET /api/leaderboard/friends` (auth)

## How to run
Install k6 (one-time), then:

```bash
export BASE_URL="https://habit-tracker.ltu-m7011e-8.se"
export TOKEN="<SUPABASE_JWT>"
export HABIT_ID="1"
export VUS="10"
export DURATION="2m"

k6 run infra/loadtest/k6/habit-tracker.js
```