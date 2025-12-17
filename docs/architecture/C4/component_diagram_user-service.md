```mermaid
flowchart LR
  subgraph UserService["Container: user-service (Node/Express)"]
    index[index.js\nExpress app]
    metricsMW[metricsMiddleware]
    openapi[Swagger UI\n/api/docs]
    authMW[requireAuth middleware\nverifies Supabase JWT]
    usersRoutes[usersRoutes.js\n/api/users/*]
    userSvc[userService.js\nprofiles + friends logic]
    validation[utils/validation.js\nvalidateUUID + validateUsername]
    supaClient[supabaseClient.js\nsupabaseAdmin (service role)]
    rabbitPub[rabbitmq.js\npublisher + reconnect]
    promMetrics[prom-client registry\nbusiness metrics:\nfriend_requests_* counters,\nfriendships_removed_total,\ntotal_users gauge]
  end

  index --> metricsMW
  index --> openapi

  index -->|/api/users| authMW --> usersRoutes --> userSvc --> supaClient
  userSvc --> validation

  usersRoutes -->|publish user.friendship.changed| rabbitPub
  userSvc --> promMetrics
```