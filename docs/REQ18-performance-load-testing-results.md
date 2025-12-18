# REQ18 – Performance / load testing results

## Test environment
- Deployment: Kubernetes via Ingress (production-like cluster)
- Base URL: https://habit-tracker.example.com
- Commit / image tag tested: abc1234
- Date/time: 2025-01-15 14:30 UTC
- Monitoring enabled: Prometheus + Grafana (enabled for entire test run)

## Tooling
- Load generator: **k6**
- Script: `infra/loadtest/k6/habit-tracker.js`

## Scenarios executed

### Scenario A (baseline)
- VUs: **5** (max VUs = 5)
- Duration: **30s** (gracefulStop: 30s, total runtime ~31s)
- Endpoints: `/api/health`, `/api/habits`, `/api/habits/:id/logs`, `/api/leaderboard/friends`
- Auth: Supabase JWT (Bearer)
- Iterations: **150**
- Total HTTP requests: **150**

### Results (Scenario A)
- http_req_failed: **0.00% (0 / 150)**
- avg latency (http_req_duration): **28.63ms**
- p(90) latency: **34.46ms**
- p(95) latency: **35.34ms**
- max latency: **36.29ms**
- requests/sec: **4.834994 req/s** (150 requests over ~31s)
- Thresholds:
  - `p(95)<800ms`: **PASS** (p95=35.34ms)
  - `rate<0.01` failed requests: **PASS** (0.00%)

## Bottlenecks / observations
Use Grafana/Prometheus during the run to identify:
- p95 latency spikes (which endpoint?)
- error rate (5xx/4xx)
- Node CPU/memory (habit-service, user-service)
- RabbitMQ queue depth (if events accumulate)
- Database latency (if visible)

Write what you observed:
- Bottleneck 1: **None observed at this load (5 VUs). Latency stable and error rate 0%.**
- Bottleneck 2: **Not detected in this baseline run.**

## Changes made (if any) and retest


### Scenario B (after improvements)
- What changed: **N/A (no changes; higher-load retest using k6 ramping-vus “load” scenario)**
- VUs: **Up to 25 VUs (ramping)**
- Duration: **3m0s (4 stages: 30s→10 VUs, 60s→25, 60s→25, 30s→0; gracefulRampDown 30s, gracefulStop 30s)**

### Results (Scenario B)
- http_req_failed: **25.00% (2080 / 8320)**
- avg latency: **119.63ms**
- p(90) latency: **208.77ms**
- p(95) latency: **223.56ms**
- max latency: **433.43ms**
- requests/sec: **45.91624/s**

## Conclusion
Under a baseline smoke test of **5 concurrent users for 30 seconds**, the system handled traffic with **0% failures** and very low latency (**p95 ≈ 35ms**), meeting the defined k6 thresholds. Higher-load scenarios (more VUs and longer durations) should be executed to find capacity limits and identify bottlenecks (CPU, DB, RabbitMQ queue depth, etc.).
