```mermaid
flowchart LR
  subgraph HabitService["Container: habit-service (Node/Express)"]
    index[index.js\nExpress app]
    helmet[helmet + cors + express.json]
    metricsMW[metricsMiddleware\n(records http_requests_total & duration)]
    openapi[Swagger UI\n/api/docs]

    authMW[requireAuth middleware\nverifies Supabase JWT]
    habitsRoutes[habitsRoutes.js\n/api/habits/*]
    leaderboardRoutes[leaderboardRoutes.js\n/api/leaderboard/*]

    habitsSvc[habitsService.js\nDB CRUD + habit_logs upsert]
    leaderboardSvc[leaderboardService.js\nfriends leaderboard aggregation]

    supaClient[supabaseClient.js\nsupabaseAdmin (service role)]
    rabbitPub[rabbitmq.js\npublisher + reconnect\n(topic exchange)]

    promMetrics[prom-client registry\nbusiness metrics:\nactiveHabits, habitCompletionsTotal,\nrabbitmq publish counters]
  end

  index --> helmet
  index --> metricsMW
  index --> openapi

  index -->|/api/habits| authMW --> habitsRoutes --> habitsSvc --> supaClient
  index -->|/api/leaderboard| authMW --> leaderboardRoutes --> leaderboardSvc --> supaClient

  habitsRoutes -->|publish habit.created| rabbitPub
  habitsRoutes -->|publish habit.completed| rabbitPub

  habitsSvc --> promMetrics
  rabbitPub --> promMetrics
```