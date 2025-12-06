# CI/CD Workflows

This repository uses GitHub Actions for Continuous Integration (CI) and Continuous Deployment (CD).

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: On push to `main` or pull requests to `main`

**Purpose**: Run tests for all services
- Frontend tests
- Habit-service tests
- User-service tests (when available)
- Analytics-service tests (when available)

### 2. CD Workflow (`.github/workflows/cd.yml`)

**Trigger**: On push to `main` branch

**Purpose**: Automatically build Docker images and deploy to Kubernetes

**What it does**:
1. Builds Docker images for all services (frontend, habit-service, user-service, analytics-service)
2. Tags images with Git commit SHA (e.g., `brandonchongwenjun/habit-frontend:abc1234`)
3. Also tags with `latest` for convenience
4. Pushes images to Docker Hub
5. Updates `infra/k8s/helm/habit-tracker/values.yaml` with new image tags
6. Commits and pushes the updated `values.yaml` back to Git
7. Argo CD automatically detects the Git change and syncs the new deployment

## Setup Instructions

### Prerequisites

1. **Docker Hub Account**
   - Create an account at https://hub.docker.com
   - Create an access token: Account Settings → Security → New Access Token

2. **GitHub Secrets**

   Go to your GitHub repository → Settings → Secrets and variables → Actions

   Add the following secrets:

   - `DOCKERHUB_USERNAME`: Your Docker Hub username (e.g., `brandonchongwenjun`)
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token

### How It Works

1. **Developer pushes code to `main`**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

2. **CI workflow runs** (tests must pass)

3. **CD workflow runs automatically**:
   - Builds all Docker images
   - Tags with commit SHA: `your-username/service-name:abc1234`
   - Pushes to Docker Hub
   - Updates `values.yaml`:
     ```yaml
     frontend:
       image: your-username/habit-frontend:abc1234
     ```
   - Commits and pushes the update

4. **Argo CD syncs**:
   - Detects Git change in `values.yaml`
   - Pulls new images from Docker Hub
   - Redeploys pods with new images

### Manual Deployment (if needed)

If you need to manually trigger a deployment:

```bash
# Build and push images
cd frontend && docker build -t your-username/habit-frontend:latest .
docker push your-username/habit-frontend:latest

# Update values.yaml manually, then:
git add infra/k8s/helm/habit-tracker/values.yaml
git commit -m "chore: update image tags"
git push
```

### Troubleshooting

**Images not updating in K8s?**
- Check that `imagePullPolicy: Always` is set in deployment templates (✅ Already configured)
- Verify Argo CD is syncing: `kubectl get applications -n argocd`
- Check pod logs: `kubectl logs -n habit-dev deployment/habit-frontend`

**CD workflow failing?**
- Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Check Docker Hub rate limits (free tier has limits)
- Verify image names match your Docker Hub repository names

**Argo CD not syncing?**
- Check Argo CD application status
- Verify Git repository URL is correct in Argo CD
- Check Argo CD logs: `kubectl logs -n argocd deployment/argocd-repo-server`

