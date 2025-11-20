# Missing Items & Upcoming To-Dos

## 1. Supabase Setup (Immediate Action)
Since you haven't set up Supabase yet, your services will fail to start or error out because they cannot connect to the database.

**Action Items:**
1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2.  **Get Credentials**:
    *   `SUPABASE_URL`
    *   `SUPABASE_SERVICE_ROLE_KEY` (for Backend services - `habit-service`, `user-service`, `analytics-service`)
    *   `SUPABASE_ANON_KEY` (for Frontend `VITE_SUPABASE_ANON_KEY`)
3.  **Run Database Schema**:
    *   Go to the SQL Editor in Supabase.
    *   Run the SQL from `docs/database-schema.md` (create tables: `users`, `habits`, `habit_logs`, `habit_stats`, `friends`).
    *   Run the RLS policies from `supabase/rls-policies.sql`.

## 2. Environment Variables (.env)
You need to create `.env` files for each service. Since Supabase isn't ready, you can use placeholders for now, but **replace them** once you have the real credentials.

**Locations:**
*   `habit-service/.env`
*   `user-service/.env`
*   `analytics-service/.env`
*   `frontend/.env`

**Template (`habit-service/.env`, `user-service/.env`, `analytics-service/.env`):**
```bash
PORT=4000 # (Use 4001 for user-service)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

**Template (`frontend/.env`):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_BASE_URL=http://localhost:8080/api # Updated to point to Nginx Gateway
```

## 3. Frontend & API Gateway (Crucial for Development)
We have set up an Nginx proxy (`http://localhost:8080`) to route requests correctly:
*   `/api/habits` -> `habit-service:4000`
*   `/api/users` -> `user-service:4001`

Ensure you run `docker compose up --build` to start the Nginx container along with the services.

## 4. Upcoming To-Dos
*   [x] **Fix Frontend Routing**: Implement Option A or B above.
*   [ ] **Verify User Service**: Test the new `/api/users/profile` and `/api/users/friends` endpoints once DB is ready.
*   [ ] **Redis Implementation** (Deferred): You chose to skip this for now, but keep it in mind for the "Dynamic Web Systems" requirements later.
*   [ ] **Test Coverage**: Ensure `habit-service` and `user-service` both have >50% test coverage.
