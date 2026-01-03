# Diagrams Folder

This folder should contain visual diagrams for the Habit Tracker system.

## Required Diagrams

### 1. microservices.png
**Purpose:** Show microservices architecture and communication patterns

**Should Include:**
- All 4 microservices (Frontend, Habit Service, User Service, Analytics Service)
- RabbitMQ message broker
- Supabase (Database + Auth + Realtime)
- Communication arrows showing:
  - HTTP/REST calls (Frontend → Services)
  - RabbitMQ events (Services → RabbitMQ → Analytics)
  - Database queries (Services → Supabase)
  - WebSocket subscriptions (Frontend ← Supabase Realtime)
- Nginx Ingress for routing

**Tools to Create:**
- draw.io (diagrams.net)
- Lucidchart
- PlantUML
- Mermaid (can be rendered from markdown)

**Reference:** See `docs/architecture/C4/container_diagram.md` for Mermaid code

---

### 2. cicd.png
**Purpose:** Show CI/CD pipeline flow from code to deployment

**Should Include:**
- Developer pushes code to GitHub
- GitHub Actions CI workflow:
  - Run tests (frontend, habit-service, user-service, analytics-service)
  - Build Docker images
  - Push to Docker Hub
- GitHub Actions CD workflow:
  - Update Helm values.yaml with new image tags
  - Commit and push to Git
- ArgoCD:
  - Detects Git changes
  - Syncs Helm chart to Kubernetes
- Kubernetes:
  - Pulls new images
  - Rolling update of pods

**Tools to Create:**
- draw.io
- Lucidchart
- GitHub Actions workflow visualizer

---

### 3. security-flow.png
**Purpose:** Show security model and request flow for authenticated requests

**Should Include:**
- User authentication flow:
  - User → Frontend → Supabase Auth
  - JWT issuance
- Authenticated API request flow:
  - Browser → HTTPS → Nginx Ingress (TLS termination)
  - Ingress → HTTP → Service (internal)
  - Service → JWT verification
  - Service → Database query (with user_id filter)
  - Service → Response
- Security layers:
  - TLS encryption
  - JWT authentication
  - Row-Level Security (RLS)
  - Input validation

**Tools to Create:**
- draw.io
- Lucidchart
- Sequence diagram tool

**Reference:** See `Report/04-security.md` section 4 for text-based flow

---

### 4. monitoring.png
**Purpose:** Show monitoring and observability architecture

**Should Include:**
- Services exposing /metrics endpoints
- Prometheus scraping metrics every 15s
- Prometheus storing time-series data
- Grafana querying Prometheus
- Grafana dashboards
- Kubernetes logs (stdout/stderr)
- (Optional) Future: ELK/Loki for centralized logging
- (Optional) Future: Jaeger for distributed tracing

**Tools to Create:**
- draw.io
- Lucidchart

**Reference:** See `Report/05-observability.md` section 1.1 for text-based architecture

---

### 5. erd.png
**Purpose:** Entity Relationship Diagram showing database schema

**Should Include:**
- All 5 tables:
  - user_profiles
  - habits
  - habit_logs
  - habit_stats
  - friends
- auth.users (Supabase Auth)
- Columns for each table (name, type, constraints)
- Primary keys (PK)
- Foreign keys (FK) with arrows
- Relationships:
  - auth.users → user_profiles (1:1)
  - user_profiles → habits (1:N)
  - habits → habit_logs (1:N)
  - habits → habit_stats (1:1)
  - user_profiles ↔ friends (M:N self-referential)
- Unique constraints
- Indexes

**Tools to Create:**
- dbdiagram.io (recommended - generates from SQL-like syntax)
- draw.io
- Lucidchart
- DBeaver (can generate from existing database)
- Supabase Table Editor (can export schema)

**Reference:** See `Report/06-database-schema.md` for complete schema details

**Example dbdiagram.io syntax:**
```
Table user_profiles {
  user_id uuid [pk, ref: > auth.users.id]
  username text [unique, not null]
  display_name text
  created_at timestamptz
  updated_at timestamptz
}

Table habits {
  id bigserial [pk]
  user_id uuid [ref: > auth.users.id, not null]
  name text [not null]
  description text
  created_at timestamptz
  archived boolean
}

Table habit_logs {
  id bigserial [pk]
  habit_id bigint [ref: > habits.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  date date [not null]
  value integer [not null]
  created_at timestamptz
  
  Indexes {
    (habit_id, date) [unique]
  }
}

Table habit_stats {
  habit_id bigint [ref: > habits.id, pk]
  user_id uuid [ref: > auth.users.id, pk]
  total_completions integer [not null]
  current_streak integer [not null]
  longest_streak integer [not null]
  last_completed_date date
}

Table friends {
  user_id uuid [ref: > auth.users.id, pk]
  friend_id uuid [ref: > auth.users.id, pk]
  status text [not null]
  created_at timestamptz
  updated_at timestamptz
}
```

---

## How to Create Diagrams

### Option 1: Online Tools (Recommended)

1. **draw.io (diagrams.net)**
   - Free, no account required
   - Export as PNG
   - https://app.diagrams.net/

2. **dbdiagram.io (for ERD)**
   - Free, simple syntax
   - Export as PNG
   - https://dbdiagram.io/

3. **Lucidchart**
   - Free tier available
   - Professional templates
   - https://www.lucidchart.com/

### Option 2: Code-Based (Mermaid)

Create diagrams in markdown and render to PNG:

```bash
# Install mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Convert mermaid to PNG
mmdc -i diagram.mmd -o diagram.png
```

### Option 3: Generate from Existing Code

**For ERD:**
```bash
# Use Supabase Studio to export schema
# Or use DBeaver to connect and generate diagram
```

---

## Notes

**Current Status:** Placeholder files created, diagrams need to be generated

**Priority:**
1. **erd.png** - Most important, shows data model
2. **microservices.png** - Shows system architecture
3. **cicd.png** - Shows deployment pipeline
4. **security-flow.png** - Shows security model
5. **monitoring.png** - Shows observability

**Recommendation:** Use the existing Mermaid diagrams in `docs/architecture/C4/` as a starting point. Convert them to PNG using mermaid-cli or screenshot from GitHub/Mermaid Live Editor.

---

## Quick Start

### Convert Existing Mermaid to PNG

1. Copy Mermaid code from `docs/architecture/C4/container_diagram.md`
2. Go to https://mermaid.live/
3. Paste code
4. Click "Actions" → "PNG" to download
5. Save as `microservices.png`

Repeat for other diagrams!

