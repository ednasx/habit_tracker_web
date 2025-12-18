// infra/loadtest/k6/habit-tracker.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://habit-tracker.ltu-m7011e-8.se";
const TOKEN = __ENV.TOKEN || "";           // Supabase JWT (Bearer)
const HABIT_ID = __ENV.HABIT_ID || "1";    // must be a habit that belongs to the TOKEN user

// Scenario selector: set K6_SCENARIO to "smoke" | "load" | "stress"
// If not set, defaults to smoke.
const ONLY = __ENV.K6_SCENARIO || "smoke";

// Smoke tuning (optional env overrides)
const SMOKE_VUS = Number(__ENV.SMOKE_VUS || __ENV.VUS || 5);
const SMOKE_DURATION = __ENV.SMOKE_DURATION || __ENV.DURATION || "30s";

export const options = {
  scenarios: {
    ...(ONLY === "smoke"
      ? {
          smoke: {
            executor: "constant-vus",
            vus: SMOKE_VUS,
            duration: SMOKE_DURATION,
          },
        }
      : {}),

    ...(ONLY === "load"
      ? {
          load: {
            executor: "ramping-vus",
            stages: [
              { duration: "30s", target: 10 },
              { duration: "60s", target: 25 },
              { duration: "60s", target: 25 },
              { duration: "30s", target: 0 },
            ],
            gracefulRampDown: "30s",
          },
        }
      : {}),

    ...(ONLY === "stress"
      ? {
          stress: {
            executor: "ramping-vus",
            stages: [
              { duration: "30s", target: 25 },
              { duration: "60s", target: 50 },
              { duration: "60s", target: 75 },
              { duration: "30s", target: 0 },
            ],
            gracefulRampDown: "30s",
          },
        }
      : {}),
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],   // <1% errors
    http_req_duration: ["p(95)<800"], // p95 under 800ms
  },
};

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

function tags(name) {
  return { name };
}

export default function () {
  // 1) Unprotected health check
  {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: tags("GET /api/health"),
    });
    check(res, { "health 200": (r) => r.status === 200 });
  }

  // 2) Protected endpoints (require JWT)
  if (TOKEN) {
    // List habits
    {
      const res = http.get(`${BASE_URL}/api/habits`, {
        headers: authHeaders(),
        tags: tags("GET /api/habits"),
      });
      check(res, { "list habits 200": (r) => r.status === 200 });
    }

    // Log completion
    {
      const payload = JSON.stringify({ value: 1 });
      const res = http.post(`${BASE_URL}/api/habits/${HABIT_ID}/logs`, payload, {
        headers: authHeaders(),
        tags: tags("POST /api/habits/:id/logs"),
      });

      const ok = check(res, {
        "log completion 201/200": (r) => r.status === 201 || r.status === 200,
      });

      // Print reason if it fails (super helpful for debugging 401/403/404/500)
      if (!ok) {
        console.log(
          `log failed: habit=${HABIT_ID} status=${res.status} body=${res.body}`
        );
      }
    }

    // Friends leaderboard
    {
      const res = http.get(`${BASE_URL}/api/leaderboard/friends?limit=10`, {
        headers: authHeaders(),
        tags: tags("GET /api/leaderboard/friends"),
      });
      check(res, { "leaderboard 200": (r) => r.status === 200 });
    }
  }

  sleep(1);
}
