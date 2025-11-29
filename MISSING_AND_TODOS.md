# Missing Items & Upcoming To-Dos
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


## 3. Automated CI/CD Pipeline (Future Enhancement) 🚀

Currently, when you change application code, you must manually:
1. Build Docker images
2. Push to Docker Hub
3. Argo CD detects image changes (if using image tags)

**Goal**: Automate this process so code changes automatically trigger builds and deployments.

### Implementation Plan

**GitHub Actions Workflow** (`.github/workflows/cd.yml`):
1. **Trigger**: On push to `main` branch (or merge to main)
2. **Build Stage**:
   - Build Docker images for all services (`habit-service`, `user-service`, `analytics-service`, `frontend`)
   - Tag images with Git commit SHA: `YOUR_USERNAME/habit-service:${GITHUB_SHA}`
   - Push to Docker Hub
3. **Update Helm Values**:
   - Update `infra/k8s/helm/habit-tracker/values.yaml` with new image tags
   - Commit and push back to Git
4. **Argo CD Sync**:
   - Argo CD automatically detects Git change
   - Pulls new images and redeploys

### Benefits
- ✅ No manual `docker build`/`docker push` commands
- ✅ Automatic deployments on code changes
- ✅ Image versioning via Git commit SHA
- ✅ Rollback capability (previous image tags in Git history)

### Prerequisites
- Docker Hub account with access token
- GitHub Secrets configured: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- Argo CD already watching Git repo (✅ Done)

### Example Workflow Structure
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push images
        # Build all services, tag with ${{ github.sha }}, push to Docker Hub
      - name: Update Helm values
        # Update values.yaml with new image tags
      - name: Commit and push
        # Git commit and push updated values.yaml


## 4. Upcoming To-Dos

- [ ] **Supabase Secrets**: Create K8s secrets for Supabase credentials in production
- [ ] **Verify User Service**: Test the new `/api/users/profile` and `/api/users/friends` endpoints once DB is ready
- [ ] **Frontend Production Build**: Switch from Vite dev server to production build with Nginx (when ready for production)
- [ ] **Redis Implementation** (Deferred): Skipped for now, but keep in mind for "Dynamic Web Systems" requirements (leaderboard performance)
- [ ] **Test Coverage**: Ensure `habit-service` and `user-service` both have >50% test coverage
- [ ] **CI/CD Pipeline**: Implement automated build and deployment workflow (see Section 3 above)
- [ ] **Monitoring & Observability**: Set up Prometheus and Grafana for metrics collection (REQ13)
- [ ] **Performance Testing**: Load testing and bottleneck identification (REQ18, REQ19)
- [ ] **Security Hardening**: Complete HTTPS/SSL setup, SQL injection/XSS protection documentation (REQ20-REQ24)
- [ ] **Compliance**: GDPR considerations and ethical analysis documentation (REQ25-REQ27)
