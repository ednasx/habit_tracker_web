# Motivation: Dynamic Web System

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## What Makes This a Dynamic Web System?

This project qualifies as a **dynamic web system** based on the following characteristics:

### 1. Real-Time Dynamic Content Generation

The application generates personalized, dynamic content for each user:

- **Personalized Dashboards**: Each user sees their own habits, completion history, and statistics
- **Real-Time Updates**: Using Supabase Realtime, the frontend subscribes to database changes and automatically updates when:
  - A habit is marked as completed
  - Statistics are recalculated by the analytics service
  - Friend requests are received or accepted
- **Dynamic Leaderboards**: Friend leaderboards are computed on-demand based on:
  - Current user's friend relationships
  - Real-time habit completion data
  - Dynamically calculated streaks and statistics

### 2. Microservices Architecture with Event-Driven Communication

The system employs a distributed microservices architecture:

- **Habit Service**: Manages habit CRUD operations and leaderboard queries
- **User Service**: Handles user profiles and friend relationships
- **Analytics Service**: Asynchronously processes events to compute statistics
- **Message Queue (RabbitMQ)**: Enables asynchronous, event-driven communication between services
  - `habit.completed` events trigger analytics recalculation
  - `user.friendship.changed` events update leaderboard visibility

This architecture demonstrates:
- **Loose coupling**: Services communicate via events, not direct calls
- **Scalability**: Each service can be scaled independently
- **Resilience**: Services continue functioning even if others are temporarily unavailable

### 3. Database-Driven Dynamic Behavior

All content is stored in and retrieved from a PostgreSQL database (Supabase):

- **Dynamic Queries**: Content is generated based on authenticated user context
- **Row-Level Security (RLS)**: Database policies dynamically filter data based on JWT claims
- **Computed Statistics**: The analytics service continuously updates:
  - Current streaks (calculated from consecutive completion dates)
  - Longest streaks (historical maximum)
  - Total completions (aggregated from logs)
  - Last completion dates

### 4. User Authentication and Authorization

The system implements JWT-based authentication with dynamic authorization:

- **Supabase Auth**: Issues JWTs for authenticated users
- **Backend Verification**: Each API request verifies JWT and extracts user identity
- **Dynamic Access Control**: 
  - Users can only view/modify their own habits
  - Friend leaderboards dynamically filter based on accepted friendships
  - RLS policies enforce data isolation at the database level

### 5. State Management Across Distributed Components

The application maintains consistent state across multiple components:

- **Frontend State**: React hooks manage local UI state and sync with backend
- **Backend State**: Microservices maintain transactional consistency via database
- **Event-Driven State Propagation**: RabbitMQ ensures eventual consistency across services
- **Real-Time Synchronization**: Supabase Realtime pushes database changes to connected clients

### 6. Dynamic API Responses

All API endpoints return dynamic, context-aware responses:

- **GET /api/habits**: Returns habits filtered by authenticated user
- **GET /api/leaderboard/friends**: Dynamically computes rankings from:
  - Current user's friend list
  - Each friend's habit statistics
  - Real-time completion data
- **POST /api/habits/:id/logs**: Triggers cascading updates:
  1. Creates habit log entry
  2. Publishes event to RabbitMQ
  3. Analytics service consumes event
  4. Statistics are recalculated
  5. Frontend receives real-time update

### 7. Continuous Deployment and Infrastructure as Code

The system demonstrates modern dynamic infrastructure practices:

- **GitOps with ArgoCD**: Infrastructure state is continuously synchronized from Git
- **Automated CI/CD**: GitHub Actions automatically builds and deploys on code changes
- **Dynamic Scaling**: Kubernetes can scale services based on load
- **Service Discovery**: Kubernetes DNS dynamically routes requests to available pods

---

## Comparison to Static Web Systems

| Aspect | Static System | This Dynamic System |
|--------|---------------|---------------------|
| **Content** | Pre-generated HTML files | Dynamically generated per user |
| **Data** | Hardcoded or flat files | PostgreSQL database with RLS |
| **Updates** | Manual file changes | Real-time via WebSocket subscriptions |
| **Scaling** | Single server | Distributed microservices |
| **State** | Stateless or client-only | Distributed state with event-driven sync |
| **Deployment** | Manual file upload | Automated GitOps pipeline |

---

## Conclusion

The Habit Tracker system is a **fully dynamic web application** that:

1. ✅ Generates personalized content for each user
2. ✅ Maintains dynamic state across distributed services
3. ✅ Responds to real-time events and user interactions
4. ✅ Implements complex business logic (streak calculation, leaderboards)
5. ✅ Uses database-driven architecture with dynamic queries
6. ✅ Employs event-driven communication for asynchronous processing
7. ✅ Provides real-time updates to connected clients
8. ✅ Scales horizontally with microservices architecture

This architecture goes beyond simple CRUD operations to demonstrate enterprise-grade patterns for building scalable, resilient, and maintainable dynamic web systems.

