```mermaid
flowchart LR
  subgraph Analytics["Container: analytics-service (Node)"]
    consumer[index.js\nRabbitMQ consumer]
    habitHandler[habitStatsHandler.js\nhandleHabitCompleted]
    friendHandler[friendshipHandler.js\nhandleFriendshipChanged]
    supa[Supabase Admin Client\n(createClient with service role)]
  end

  rabbit[(RabbitMQ Exchange: habit.events)] -->|habit.completed -> queue habit-analytics| consumer
  rabbit -->|user.friendship.changed -> queue friendship-analytics| consumer

  consumer -->|on habit.completed| habitHandler --> supa --> db[(Supabase Postgres:\npublic.habit_stats)]
  consumer -->|on user.friendship.changed| friendHandler
```