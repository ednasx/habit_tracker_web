# CI/CD and GitOps Pipeline

**Project:** Habit Tracker  
**Course:** Design of Dynamic Web Systems

---

## Overview

The Habit Tracker employs a fully automated **CI/CD pipeline** with **GitOps deployment** using:

- **GitHub Actions** for Continuous Integration and Continuous Delivery
- **Docker Hub** for container image registry
- **ArgoCD** for GitOps-based Continuous Deployment
- **Helm** for Kubernetes package management

---

## 1. CI Pipeline (Continuous Integration)

**Workflow File:** `.github/workflows/ci.yml`  
**Trigger:** Push to `main` branch or Pull Requests

### 1.1 Test Stage

The CI pipeline runs tests for all services in parallel:

```yaml
Jobs:
  - frontend (build + test)
  - habit-service (test with coverage)
  - user-service (test with coverage)
  - analytics-service (test with coverage)
```

**Test Execution:**
1. Checkout repository
2. Setup Node.js 22.x
3. Install dependencies (`npm install`)
4. Run tests with coverage (`npm run test:coverage`)

**Test Environment:**
- `NODE_ENV=test` - Skips external service connections (RabbitMQ, Supabase)
- Mocked dependencies for unit tests
- Integration tests use in-memory or test databases

**Exit Criteria:**
- All tests must pass
- No linting errors
- Coverage thresholds met (if configured)

### 1.2 Build Stage

**Trigger:** Only on push to `main` (not PRs), after all tests pass

**Docker Image Build:**
1. Set up Docker Buildx (multi-platform support)
2. Log in to Docker Hub using secrets
3. Build images for all services:
   - `habit-frontend`
   - `habit-service`
   - `user-service`
   - `habit-analytics`
4. Tag images with:
   - Git commit SHA (e.g., `username/habit-frontend:abc123def`)
   - `latest` tag (e.g., `username/habit-frontend:latest`)
5. Push images to Docker Hub

**Build Arguments:**
- Frontend receives Supabase URL and Anon Key at build time
- Backend services receive environment variables at runtime

**Build Caching:**
- Uses Docker layer caching from previous builds
- Speeds up subsequent builds significantly

---

## 2. CD Pipeline (Continuous Delivery)

**Workflow File:** `.github/workflows/cd.yml`  
**Trigger:** After CI workflow completes successfully

### 2.1 Image Tag Update

The CD pipeline automatically updates Helm values with new image tags:

**Process:**
1. Checkout repository at the commit that triggered CI
2. Run Python script to update `infra/k8s/helm/habit-tracker/values.yaml`
3. Replace image tags with new commit SHA:
   ```yaml
   frontend:
     image: username/habit-frontend:abc123def
   habitService:
     image: username/habit-service:abc123def
   userService:
     image: username/habit-service:abc123def
   analytics:
     image: username/habit-analytics:abc123def
   ```
4. Commit changes with message: `chore: update image tags to <SHA> [skip ci]`
5. Push to `main` branch

**Conflict Resolution:**
- Uses `git pull --rebase` to handle concurrent updates
- Fails gracefully if merge conflicts occur

**Skip CI Tag:**
- `[skip ci]` in commit message prevents infinite CI loop
- ArgoCD detects the change but CI doesn't re-trigger

### 2.2 GitOps Sync (ArgoCD)

**ArgoCD Application:** `infra/gitops/habit-tracker-application.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: habit-tracker
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/ednasx/habit_tracker_web.git
    targetRevision: main
    path: infra/k8s/helm/habit-tracker
    helm:
      releaseName: habit-tracker
  destination:
    server: https://kubernetes.default.svc
    namespace: habit-dev
  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Revert manual changes to cluster
```

**Automated Sync:**
- ArgoCD polls Git repository every 3 minutes (default)
- Detects changes to `values.yaml` or Helm templates
- Automatically applies changes to Kubernetes cluster
- No manual `kubectl apply` or `helm upgrade` needed

**Self-Healing:**
- If someone manually edits a pod/deployment, ArgoCD reverts it
- Ensures cluster state always matches Git (single source of truth)

**Pruning:**
- Resources removed from Git are automatically deleted from cluster
- Prevents orphaned resources

---

## 3. Complete Pipeline Flow

### 3.1 Developer Workflow

```
1. Developer pushes code to main branch
   ↓
2. GitHub Actions CI triggered
   ↓
3. Run tests in parallel (frontend, habit-service, user-service, analytics)
   ↓
4. If tests pass → Build Docker images
   ↓
5. Tag images with commit SHA + latest
   ↓
6. Push images to Docker Hub
   ↓
7. GitHub Actions CD triggered
   ↓
8. Update values.yaml with new image tags
   ↓
9. Commit and push values.yaml to Git
   ↓
10. ArgoCD detects Git change (within 3 minutes)
   ↓
11. ArgoCD pulls new Helm chart
   ↓
12. ArgoCD applies changes to Kubernetes
   ↓
13. Kubernetes pulls new images from Docker Hub
   ↓
14. Rolling update of pods (zero downtime)
   ↓
15. New version deployed! 🎉
```

**Total Time:** ~5-10 minutes from code push to production deployment

### 3.2 Pipeline Diagram

See `diagrams/cicd.png` for visual representation.

---

## 4. Deployment Strategies

### 4.1 Rolling Update (Current Strategy)

**Kubernetes Default:**
- Gradually replaces old pods with new pods
- Ensures at least 1 pod is always running
- No downtime for users

**Configuration:**
```yaml
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0  # Always keep at least 1 pod running
      maxSurge: 1        # Can temporarily have 2 pods during update
```

**Process:**
1. Create new pod with new image
2. Wait for new pod to be ready (health checks pass)
3. Terminate old pod
4. Update complete

### 4.2 Blue-Green Deployment (Not Implemented)

**Future Enhancement:**
- Deploy new version alongside old version
- Switch traffic instantly via Service selector
- Instant rollback if issues detected

### 4.3 Canary Deployment (Not Implemented)

**Future Enhancement:**
- Deploy new version to small percentage of pods
- Monitor metrics (error rate, latency)
- Gradually increase traffic to new version
- Rollback if metrics degrade

---

## 5. Rollback Strategies

### 5.1 Git-Based Rollback

**Scenario:** New deployment has bugs

**Process:**
1. Revert the commit that updated `values.yaml`
2. Push revert commit to Git
3. ArgoCD automatically syncs old image tags
4. Kubernetes rolls back to previous version

**Command:**
```bash
git revert <commit-sha>
git push origin main
```

**Time to Rollback:** ~3-5 minutes (ArgoCD sync + pod restart)

### 5.2 ArgoCD Manual Rollback

**Via ArgoCD UI:**
1. Open ArgoCD dashboard
2. Navigate to `habit-tracker` application
3. Click "History and Rollback"
4. Select previous revision
5. Click "Rollback"

**Via ArgoCD CLI:**
```bash
argocd app rollback habit-tracker <revision>
```

### 5.3 Kubernetes Rollback

**Emergency Rollback:**
```bash
kubectl rollout undo deployment/habit-service -n habit-dev
```

**Note:** This bypasses GitOps - ArgoCD will revert it unless `selfHeal` is disabled

---

## 6. Environment Management

### 6.1 Current Setup

**Single Environment:**
- Namespace: `habit-dev`
- Used for development and testing

### 6.2 Multi-Environment Strategy (Future)

**Proposed Setup:**

| Environment | Namespace | Branch | ArgoCD App | Purpose |
|-------------|-----------|--------|------------|---------|
| Development | `habit-dev` | `develop` | `habit-tracker-dev` | Feature development |
| Staging | `habit-staging` | `staging` | `habit-tracker-staging` | Pre-production testing |
| Production | `habit-prod` | `main` | `habit-tracker-prod` | Live users |

**Promotion Flow:**
```
develop → staging → main
   ↓         ↓        ↓
habit-dev  staging  prod
```

---

## 7. Secrets Management

### 7.1 GitHub Secrets

**Required Secrets:**
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Configuration:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add each secret
3. Secrets are encrypted and only accessible to workflows

### 7.2 Kubernetes Secrets

**Supabase Credentials:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: supabase-secret
  namespace: habit-dev
type: Opaque
data:
  SUPABASE_URL: <base64-encoded>
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded>
  SUPABASE_JWT_SECRET: <base64-encoded>
```

**Created Manually:**
```bash
kubectl create secret generic supabase-secret \
  --from-literal=SUPABASE_URL=https://xxx.supabase.co \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=xxx \
  --from-literal=SUPABASE_JWT_SECRET=xxx \
  -n habit-dev
```

**Not Stored in Git:**
- Secrets are created manually in cluster
- Not managed by ArgoCD (security best practice)
- Deployments reference secrets via `envFrom`

---

## 8. Monitoring the Pipeline

### 8.1 GitHub Actions

**View Workflow Runs:**
1. Go to repository → Actions tab
2. See all workflow runs with status (success/failure)
3. Click on a run to see detailed logs

**Notifications:**
- GitHub sends email on workflow failure
- Can integrate with Slack/Discord for team notifications

### 8.2 ArgoCD Dashboard

**Access:**
```bash
kubectl port-forward -n argocd svc/argocd-server 8080:443
# Open https://localhost:8080
```

**View Application Status:**
- **Synced** - Cluster matches Git
- **OutOfSync** - Changes detected in Git, not yet applied
- **Progressing** - Sync in progress
- **Degraded** - Pods failing health checks

**Application Health:**
- **Healthy** - All pods running and ready
- **Progressing** - Deployment in progress
- **Degraded** - Some pods failing
- **Suspended** - Manually paused

### 8.3 Kubernetes Events

**Watch Deployment Progress:**
```bash
kubectl get pods -n habit-dev -w
kubectl describe deployment habit-service -n habit-dev
kubectl logs -f deployment/habit-service -n habit-dev
```

---

## 9. Pipeline Metrics

### 9.1 Key Performance Indicators

**Build Time:**
- Frontend build: ~2-3 minutes
- Backend builds: ~1-2 minutes each
- Total CI time: ~5-7 minutes

**Deployment Time:**
- ArgoCD sync: ~1-2 minutes
- Pod startup: ~30-60 seconds
- Total CD time: ~3-5 minutes

**Reliability:**
- Target: 95%+ successful deployments
- Rollback time: <5 minutes

### 9.2 Improvement Opportunities

**Speed:**
- ✅ Docker layer caching (implemented)
- ⚠️ Parallel builds (partially implemented)
- ❌ Build artifact caching (not implemented)

**Reliability:**
- ✅ Automated tests (implemented)
- ⚠️ Integration tests (basic)
- ❌ End-to-end tests (not implemented)
- ❌ Smoke tests after deployment (not implemented)

**Security:**
- ✅ Secrets management (implemented)
- ⚠️ Image scanning (not implemented)
- ❌ Dependency vulnerability scanning (not implemented)

---

## 10. Best Practices Implemented

✅ **Infrastructure as Code** - All infrastructure defined in Git  
✅ **Automated Testing** - Tests run on every commit  
✅ **Immutable Deployments** - Images tagged with commit SHA  
✅ **GitOps** - Git as single source of truth  
✅ **Zero-Downtime Deployments** - Rolling updates  
✅ **Automated Rollback** - Git revert triggers rollback  
✅ **Secrets Management** - Sensitive data not in Git  
✅ **Audit Trail** - All changes tracked in Git history  

---

## 11. Troubleshooting Guide

### 11.1 CI Pipeline Fails

**Symptom:** GitHub Actions workflow shows red X

**Diagnosis:**
1. Click on failed workflow run
2. Expand failed job to see error logs
3. Common issues:
   - Test failures → Fix code and push again
   - Docker Hub login fails → Check secrets
   - Build errors → Check Dockerfile syntax

### 11.2 CD Pipeline Fails

**Symptom:** values.yaml not updated or push fails

**Diagnosis:**
1. Check CD workflow logs
2. Common issues:
   - Python script error → Check values.yaml format
   - Git push fails → Merge conflict (manual resolution needed)
   - Permission denied → Check GitHub token permissions

### 11.3 ArgoCD Not Syncing

**Symptom:** Changes in Git not reflected in cluster

**Diagnosis:**
1. Open ArgoCD UI
2. Check application status
3. Common issues:
   - Manual sync disabled → Enable auto-sync
   - Helm chart errors → Check template syntax
   - Image pull errors → Check Docker Hub credentials

**Manual Sync:**
```bash
argocd app sync habit-tracker
```

### 11.4 Pods Not Starting

**Symptom:** Pods stuck in `ImagePullBackOff` or `CrashLoopBackOff`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n habit-dev
kubectl logs <pod-name> -n habit-dev
```

**Common issues:**
- Image not found → Check Docker Hub, verify image tag
- Missing secrets → Create Kubernetes secret
- Application crash → Check logs for errors

---

## Conclusion

The Habit Tracker CI/CD pipeline demonstrates:

✅ **Full Automation** - From code push to production deployment  
✅ **GitOps Principles** - Git as single source of truth  
✅ **Fast Feedback** - Tests run in ~5 minutes  
✅ **Zero Downtime** - Rolling updates with health checks  
✅ **Easy Rollback** - Git revert triggers automatic rollback  
✅ **Audit Trail** - All changes tracked in Git history  
✅ **Security** - Secrets managed separately from code  

This pipeline enables rapid, reliable, and safe deployments while maintaining full traceability and control.

