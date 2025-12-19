```mermaid
flowchart LR
  subgraph Analytics["Container: analytics-service (Node)"]
    consumer["index.js<br/>RabbitMQ consumer"]
    habitHandler["habitStatsHandler.js<br/>handleHabitCompleted"]
    friendHandler["friendshipHandler.js<br/>handleFriendshipChanged"]
    supa["Supabase Admin Client<br/>(createClient with service role)"]
  end

  rabbit["RabbitMQ Exchange: habit.events"] -->|"habit.completed -> queue habit-analytics"| consumer
  rabbit -->|"user.friendship.changed -> queue friendship-analytics"| consumer

  consumer -->|"on habit.completed"| habitHandler --> supa --> db["Supabase Postgres<br/>public.habit_stats"]
  consumer -->|"on user.friendship.changed"| friendHandler
