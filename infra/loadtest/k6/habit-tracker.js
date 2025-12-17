import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://habit-tracker.ltu-m7011e-8.se";
const TOKEN = __ENV.TOKEN || ""; // Supabase JWT (Bearer token)
const HABIT_ID = __ENV.HABIT_ID || "1"; // existing habit id for the test user

// Keep scenarios configurable via env vars
const SMOKE_VUS = Number(__ENV.SMOKE_VUS || __ENV.VUS || 5);
const SMOKE_DURATION = __ENV.SMOKE_DURATION || __ENV.DURATION || "30s";

const ONLY = __ENV.K6_SCENARIO || null;

export const options = {
  scenarios: {
    ...(ONLY ? {} : {
      smoke: {
        executor: "constant-vus",
        vus: Number(__ENV.VUS || 5),
        duration: __ENV.DURATION || "30s",
      },
    }),

    ...(ONLY === "smoke" ? {
      smoke: {
        executor: "constant-vus",
        vus: Number(__ENV.VUS || 5),
        duration: __ENV.DURATION || "30s",
      },
    } : {}),

    ...(ONLY === "load" ? {
      load: {
        executor: "ramping-vus",
        stages: [
          { duration: "30s", target: 10 },
          { duration: "60s", target: 25 },
          { duration: "60s", target: 25 },
          { duration: "30s", target: 0 },
        ],
      },
    } : {}),

    ...(ONLY === "stress" ? {
      stress: {
        executor: "ramping-vus",
        stages: [
          { duration: "30s", target: 25 },
          { duration: "60s", target: 50 },
          { duration: "60s", target: 75 },
          { duration: "30s", target: 0 },
        ],
      },
    } : {}),
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};


function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

/**
 * Helper: request tags show up in k6 output as URL grouping.
 * Also useful if later you output JSON and aggregate by tag name.
 */
function tags(name) {
  return { name };
}

export default function () {
  // 1) Unprotected gateway/service health
  {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: tags("GET /api/health"),
    });
    check(res, { "health 200": (r) => r.status === 200 });
  }

  // 2) Protected endpoints (require Supabase JWT)
  if (TOKEN) {
    // List habits
    {
      const res = http.get(`${BASE_URL}/api/habits`, {
        headers: authHeaders(),
        tags: tags("GET /api/habits"),
      });
      check(res, { "list habits 200": (r) => r.status === 200 });
    }

    // Log completion (idempotency expected via DB upsert)
    {
      const payload = JSON.stringify({ value: 1 });
      const res = http.post(`${BASE_URL}/api/habits/${HABIT_ID}/logs`, payload, {
        headers: authHeaders(),
        tags: tags("POST /api/habits/:id/logs"),
      });
      check(res, {
        "log completion 201/200": (r) => r.status === 201 || r.status === 200,
      });
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
