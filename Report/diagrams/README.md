# Diagrams Folder

This folder contains **Mermaid diagrams** for the Habit Tracker system. All diagrams are in Markdown format and will render automatically on GitHub.

## ✅ Complete Diagrams

### 1. microservices.md
**Microservices Architecture Diagram**
- Shows all 4 microservices (Frontend, Habit Service, User Service, Analytics Service)
- RabbitMQ message broker
- Supabase (Database + Auth + Realtime)
- Nginx Ingress routing
- Prometheus + Grafana monitoring
- All communication patterns (REST, Events, WebSocket)

### 2. cicd.md
**CI/CD Pipeline Diagram**
- GitHub Actions CI stage (testing)
- Docker image building and tagging
- GitHub Actions CD stage (values.yaml update)
- ArgoCD GitOps sync
- Kubernetes rolling deployment
- Complete flow from code push to production

### 3. security-flow.md
**Security Model and Request Flow (Sequence Diagram)**
- Authentication flow with Supabase Auth
- Authenticated API request flow showing all 5 security layers:
  1. TLS/HTTPS encryption
  2. JWT authentication
  3. API authorization
  4. Input validation
  5. Row-Level Security (RLS)
- Unauthorized request handling

### 4. monitoring.md
**Monitoring and Observability Architecture**
- Services exposing /metrics endpoints
- Prometheus metrics collection
- Grafana dashboards
- Logging setup (current and future)
- Distributed tracing (future enhancement)

### 5. erd.md
**Entity Relationship Diagram (Database Schema)**
- All 6 tables (auth.users, user_profiles, habits, habit_logs, habit_stats, friends)
- Primary keys and foreign keys
- Relationships (1:1, 1:N, M:N)
- Constraints (unique, NOT NULL, check)
- Cascading deletes
- Complete with descriptions

## Viewing Diagrams

### On GitHub
All Mermaid diagrams render automatically when viewing `.md` files on GitHub. Just open any diagram file and it will display the visual diagram.

### Locally
- **VS Code:** Install "Markdown Preview Mermaid Support" extension
- **Online:** Copy diagram code and paste into https://mermaid.live/

## Diagram Format

All diagrams use **Mermaid** syntax:
- `flowchart` - For architecture and pipeline diagrams
- `sequenceDiagram` - For security request flow
- `erDiagram` - For database schema

### Why Mermaid?
✅ **Version Control** - Text-based, easy to track changes  
✅ **GitHub Native** - Renders automatically on GitHub  
✅ **No External Tools** - No need for draw.io, Lucidchart, etc.  
✅ **Maintainable** - Easy to update as code in text editor  
✅ **Professional** - Clean, consistent styling  

## References

- Full documentation for each diagram is in the corresponding Report documents
- Architecture details: `Report/02-architecture.md`
- CI/CD details: `Report/03-cicd-gitops.md`
- Security details: `Report/04-security.md`
- Monitoring details: `Report/05-observability.md`
- Database details: `Report/06-database-schema.md`

