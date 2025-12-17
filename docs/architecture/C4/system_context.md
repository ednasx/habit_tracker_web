```mermaid
flowchart LR
  user(["User"]) -->|Uses in browser| web["Habit Tracker Web App"]

  subgraph HabitTracker["Habit Tracker System"]
    web
  end

  web -->|JWT auth| supaAuth["Supabase Auth"]
  web -->|REST /api/* via Ingress or local gateway| gateway["Nginx Ingress / Local Nginx Gateway"]

  gateway -->|/api/habits, /api/leaderboard| habitSvc["Habit Service"]
  gateway -->|/api/users| userSvc["User Service"]

  habitSvc -->|Service-role DB access| supaDB["Supabase Postgres (public schema)"]
  userSvc -->|Service-role DB access| supaDB

  habitSvc -->|Publish events (topic exchange)| rabbit["RabbitMQ"]
  userSvc -->|Publish events (topic exchange)| rabbit

  rabbit -->|Consume events| analytics["Analytics Service"]
  analytics -->|Update habit_stats| supaDB

  habitSvc -->|/metrics| prom["Prometheus"]
  userSvc -->|/metrics| prom
  prom --> grafana["Grafana Dashboards"]

  web -->|Realtime subscriptions (optional)| supaRT["Supabase Realtime"]
  supaDB --> supaRT
```