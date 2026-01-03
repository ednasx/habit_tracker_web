# CI/CD Pipeline

This diagram shows the complete CI/CD pipeline from code commit to production deployment.

```mermaid
flowchart TD
    Dev["👨‍💻 Developer<br/>git push main"] --> GitHub["📦 GitHub Repository"]
    
    GitHub -->|"Trigger on push"| CI["🔄 GitHub Actions CI"]
    
    subgraph CI_Jobs["CI Stage - Parallel Testing"]
        TestFE["Test Frontend<br/>npm test"]
        TestHabit["Test Habit Service<br/>npm run test:coverage"]
        TestUser["Test User Service<br/>npm run test:coverage"]
        TestAnalytics["Test Analytics Service<br/>npm run test:coverage"]
    end
    
    CI --> CI_Jobs
    
    CI_Jobs -->|"All tests pass"| Build["🔨 Build Docker Images"]
    CI_Jobs -->|"Any test fails"| Fail["❌ Build Failed<br/>Notify developer"]
    
    Build -->|"Tag: commit SHA + latest"| DockerHub["🐳 Docker Hub<br/>Image Registry"]
    
    DockerHub --> CD["🚀 GitHub Actions CD"]
    
    CD -->|"1. Update values.yaml"| UpdateValues["📝 Update Helm Values<br/>with new image tags"]
    UpdateValues -->|"2. Commit [skip ci]"| GitCommit["💾 Git Commit & Push"]
    
    GitCommit -->|"3. Detect change"| ArgoCD["🔄 ArgoCD<br/>GitOps Controller"]
    
    subgraph K8s["☸️ Kubernetes Cluster"]
        ArgoCD -->|"4. Sync Helm chart"| HelmSync["📊 Helm Chart Sync"]
        HelmSync -->|"5. Apply changes"| Deploy["🚢 Rolling Update"]
        Deploy --> Pods["🎯 New Pods<br/>Pull images from Docker Hub"]
    end
    
    Pods -->|"Health checks pass"| Success["✅ Deployment Complete"]
    
    style Dev fill:#e1f5ff
    style GitHub fill:#f0f0f0
    style CI fill:#fff3e0
    style Build fill:#e8f5e9
    style DockerHub fill:#e3f2fd
    style CD fill:#f3e5f5
    style ArgoCD fill:#fce4ec
    style Success fill:#c8e6c9
    style Fail fill:#ffcdd2
```

## Pipeline Stages

### 1. CI Stage (GitHub Actions)
- **Trigger:** Push to main branch or Pull Request
- **Jobs:** Test all 4 services in parallel
- **On Success:** Build and push Docker images
- **Duration:** ~5-7 minutes

### 2. CD Stage (GitHub Actions)
- **Trigger:** After CI completes successfully
- **Actions:**
  - Update `values.yaml` with new image tags (commit SHA)
  - Commit changes with `[skip ci]` flag
  - Push to Git repository
- **Duration:** ~1-2 minutes

### 3. GitOps Stage (ArgoCD)
- **Trigger:** Detects Git repository changes (polls every 3 minutes)
- **Actions:**
  - Pull latest Helm chart from Git
  - Compare with current cluster state
  - Apply changes to Kubernetes
- **Duration:** ~3-5 minutes

### 4. Deployment Stage (Kubernetes)
- **Process:** Rolling update (zero downtime)
- **Steps:**
  1. Pull new images from Docker Hub
  2. Start new pods
  3. Wait for health checks to pass
  4. Terminate old pods
- **Duration:** ~30-60 seconds

## Total Time
**Code push to production:** ~10-15 minutes

## Rollback Strategy
- **Git-based:** Revert commit in Git, ArgoCD auto-syncs
- **ArgoCD:** Rollback to previous revision via UI/CLI
- **Kubernetes:** `kubectl rollout undo` (emergency only)

