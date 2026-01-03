# Habit Tracker Web - Project Report

**Course:** Design of Dynamic Web Systems  
**Project:** Habit Tracker - A Microservices-based Web Application  
**Repository:** https://github.com/ednasx/habit_tracker_web

---

## Report Structure

This report folder contains comprehensive documentation for the Habit Tracker monorepo project, organized as follows:

### Documentation Files

1. **[01-motivation.md](./01-motivation.md)** - Justification for why this qualifies as a dynamic web system
2. **[02-architecture.md](./02-architecture.md)** - High-level architecture and microservices design
3. **[03-cicd-gitops.md](./03-cicd-gitops.md)** - CI/CD pipeline and GitOps deployment strategy
4. **[04-security.md](./04-security.md)** - Security model and request flow for secure connections
5. **[05-observability.md](./05-observability.md)** - Monitoring setup, metrics collection, logs, and traces
6. **[06-database-schema.md](./06-database-schema.md)** - Database schema documentation with graphical representation

### Diagrams

The `/diagrams` folder contains visual representations:

- `microservices.png` - Microservices architecture and communication patterns
- `cicd.png` - CI/CD pipeline flow
- `security-flow.png` - Security model and request flow
- `monitoring.png` - Monitoring and observability architecture
- `erd.png` - Entity Relationship Diagram for database schema

---

## Project Overview

Habit Tracker is a full-stack web application built with a microservices architecture that allows users to:

- Create and manage personal habits
- Track daily habit completions
- Connect with friends and view social leaderboards
- View analytics (streaks, completion rates)
- Receive real-time updates

### Tech Stack

- **Frontend:** React + Vite
- **Backend Services:** Node.js + Express (3 microservices)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)
- **Message Queue:** RabbitMQ
- **Container Orchestration:** Kubernetes (Helm charts)
- **CI/CD:** GitHub Actions
- **GitOps:** ArgoCD
- **Monitoring:** Prometheus + Grafana
- **TLS/Certificates:** cert-manager + Let's Encrypt

### Microservices

1. **Habit Service** (Port 4000) - Manages habits and leaderboard
2. **User Service** (Port 4001) - Manages user profiles and friendships
3. **Analytics Service** - Processes events and computes statistics
4. **Frontend** - React SPA served via Nginx

---

## Repository Access

If the repository is private, add these instructors as collaborators:
- `johankristianss`
- `casperlundberg`

---

## Quick Links

- [Main README](../README.md)
- [Architecture Documentation](../docs/architecture/)
- [Security Documentation](../docs/security.md)
- [Monitoring Setup](../docs/monitoring-setup.md)
- [Database Schema](../docs/database-schema.md)

---

**Last Updated:** January 3, 2026

---

## Important Notes

### Diagrams

The `/diagrams` folder contains placeholder `.txt` files with detailed instructions for creating each diagram. The actual PNG files need to be generated using the instructions provided.

**Quick Start for Diagrams:**
1. Read `diagrams/README.md` for overview
2. For each diagram, read the corresponding `.txt` file (e.g., `microservices.png.txt`)
3. Use the recommended tools (draw.io, dbdiagram.io, Mermaid Live Editor)
4. Follow the instructions to create the PNG files
5. Replace the `.txt` files with actual `.png` files

**Easiest Approach:**
- For `microservices.png`: Convert existing Mermaid diagram from `docs/architecture/C4/container_diagram.md` using https://mermaid.live/
- For `erd.png`: Use https://dbdiagram.io/ with the DBML code provided in `erd.png.txt`
- For other diagrams: Use https://app.diagrams.net/ (draw.io)

### What's Complete

✅ **All Documentation Files** - Comprehensive documentation for all aspects  
✅ **Motivation** - Justification as a dynamic web system  
✅ **Architecture** - Detailed microservices architecture  
✅ **CI/CD & GitOps** - Complete pipeline documentation  
✅ **Security** - Security model and request flow  
✅ **Observability** - Monitoring, metrics, logs (traces not implemented)  
✅ **Database Schema** - Complete schema with RLS policies  

### What Needs to Be Done

⚠️ **Diagrams** - Need to be generated from the provided instructions (5 diagrams)

**Last Updated:** January 3, 2026

