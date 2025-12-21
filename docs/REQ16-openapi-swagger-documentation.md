# REQ16 – OpenAPI/Swagger Documentation

## Overview

This document describes the OpenAPI/Swagger documentation implementation for the Habit Tracker application. Both microservices (Habit Service and User Service) provide complete OpenAPI 3.0 specifications and interactive Swagger UI interfaces.

---

## OpenAPI Specifications

### 1. Habit Service API

**Location:** `habit-service/openapi.yaml`

**Base URLs:**
- Development: `http://localhost:4000/api`
- Production: `https://your-domain.example.com/api`

**Swagger UI:** `http://localhost:4000/api/docs`

#### Endpoints Documented

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/health` | Health check | No |
| GET | `/habits` | List user's habits | Yes |
| POST | `/habits` | Create new habit | Yes |
| GET | `/habits/{id}` | Get single habit | Yes |
| PUT | `/habits/{id}` | Update habit | Yes |
| DELETE | `/habits/{id}` | Delete habit | Yes |
| POST | `/habits/{id}/logs` | Log habit completion | Yes |
| GET | `/leaderboard/friends` | Get friends leaderboard | Yes |

#### Schemas Defined

- **Habit** - Complete habit object with all fields
- **HabitLog** - Habit completion log entry
- **LeaderboardEntry** - Friend statistics for leaderboard
- **Error** - Standard error response format

#### Authentication

All protected endpoints require:
```
Authorization: Bearer <supabase-jwt-token>
```

**Security Scheme:**
- Type: HTTP Bearer
- Bearer Format: JWT (Supabase Auth token)

---

### 2. User Service API

**Location:** `user-service/openapi.yaml`

**Base URLs:**
- Development: `http://localhost:4001/api`
- Production: `https://your-domain.example.com/api`

**Swagger UI:** `http://localhost:4001/api/docs`

#### Endpoints Documented

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/health` | Health check | No |
| GET | `/users/profile` | Get current user's profile | Yes |
| POST | `/users/profile` | Create/update user profile | Yes |
| GET | `/users/search` | Search users by username | Yes |
| GET | `/users/friends` | List accepted friends | Yes |
| GET | `/users/friends/pending` | List pending friend requests received | Yes |
| GET | `/users/friends/sent` | List sent friend requests | Yes |
| POST | `/users/friends/request` | Send friend request by username | Yes |
| POST | `/users/friends/{friendId}/accept` | Accept friend request | Yes |
| POST | `/users/friends/{friendId}/reject` | Reject friend request | Yes |
| DELETE | `/users/friends/{friendId}` | Remove friend | Yes |

#### Schemas Defined

- **UserProfile** - User profile with username and display name
- **UserSearchResult** - Search result entry
- **Friend** - Accepted friend information
- **FriendRequest** - Pending friend request details
- **FriendRequestDetails** - Friend request with status
- **Friendship** - Friendship relationship object
- **Error** - Standard error response format

#### Authentication

Same as Habit Service - Bearer JWT tokens from Supabase Auth.

---

## Accessing Swagger UI

### Local Development

#### Habit Service
1. Start the habit service: `cd habit-service && npm run dev`
2. Open browser: `http://localhost:4000/api/docs`
3. Click "Authorize" button
4. Enter your Supabase JWT token (obtained from frontend login)
5. Try out API endpoints interactively

#### User Service
1. Start the user service: `cd user-service && npm run dev`
2. Open browser: `http://localhost:4001/api/docs`
3. Click "Authorize" button
4. Enter your Supabase JWT token
5. Try out API endpoints interactively

### Production/Kubernetes

Swagger UI is accessible through the same service endpoints:
- Habit Service: `https://your-domain.example.com/api/docs` (if routed)
- User Service: Typically internal-only in production

**Note:** In production deployments, Swagger UI may be disabled or restricted to internal networks for security reasons.

---

## Implementation Details

### Swagger UI Integration

Both services use the `swagger-ui-express` package to serve interactive documentation:

```javascript
// Example from habit-service/index.js
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

const swaggerDocument = YAML.load('./openapi.yaml')

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
```

### OpenAPI Specification Format

- **Version:** OpenAPI 3.0.0
- **Format:** YAML
- **Validation:** Specifications follow OpenAPI 3.0 standard

---

## API Documentation Completeness Verification

### ✅ Habit Service - Complete

All implemented endpoints are documented:

| Implementation | OpenAPI Spec | Status |
|----------------|--------------|--------|
| GET /api/health | ✓ | ✅ Complete |
| GET /api/habits | ✓ | ✅ Complete |
| POST /api/habits | ✓ | ✅ Complete |
| GET /api/habits/:id | ✓ | ✅ Complete |
| PUT /api/habits/:id | ✓ | ✅ Complete |
| DELETE /api/habits/:id | ✓ | ✅ Complete |
| POST /api/habits/:id/logs | ✓ | ✅ Complete |
| GET /api/leaderboard/friends | ✓ | ✅ Complete |

**Verification Date:** December 20, 2025

### ✅ User Service - Complete

All implemented endpoints are documented:

| Implementation | OpenAPI Spec | Status |
|----------------|--------------|--------|
| GET /api/health | ✓ | ✅ Complete |
| GET /api/users/profile | ✓ | ✅ Complete |
| POST /api/users/profile | ✓ | ✅ Complete |
| GET /api/users/search | ✓ | ✅ Complete |
| GET /api/users/friends | ✓ | ✅ Complete |
| GET /api/users/friends/pending | ✓ | ✅ Complete |
| GET /api/users/friends/sent | ✓ | ✅ Complete |
| POST /api/users/friends/request | ✓ | ✅ Complete |
| POST /api/users/friends/{friendId}/accept | ✓ | ✅ Complete |
| POST /api/users/friends/{friendId}/reject | ✓ | ✅ Complete |
| DELETE /api/users/friends/{friendId} | ✓ | ✅ Complete |

**Verification Date:** December 20, 2025

---

## Response Codes Documentation

### Standard HTTP Status Codes Used

#### Success Codes
- **200 OK** - Successful GET, PUT, POST (update operations)
- **201 Created** - Successful POST (create operations)
- **204 No Content** - Successful DELETE

#### Client Error Codes
- **400 Bad Request** - Validation errors, malformed requests
- **401 Unauthorized** - Missing or invalid authentication token
- **404 Not Found** - Resource not found or not owned by user
- **409 Conflict** - Duplicate username, existing friend request, etc.

#### Server Error Codes
- **500 Internal Server Error** - Unexpected server-side errors

All error responses follow the standard error schema:
```json
{
  "message": "Human-readable error message",
  "error": "Optional detailed error information"
}
```

---

## Request/Response Examples

### Example 1: Create Habit

**Request:**
```http
POST /api/habits HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Drink water",
  "description": "Drink 8 glasses of water per day"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "user_id": "91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b",
  "name": "Drink water",
  "description": "Drink 8 glasses of water per day",
  "archived": false,
  "created_at": "2025-12-20T10:15:30.000Z"
}
```

### Example 2: Send Friend Request

**Request:**
```http
POST /api/users/friends/request HTTP/1.1
Host: localhost:4001
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "username": "jane_smith"
}
```

**Response (201 Created):**
```json
{
  "message": "Friend request sent",
  "request": {
    "friend_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "jane_smith",
    "status": "pending",
    "created_at": "2025-12-20T10:20:00.000Z"
  }
}
```

### Example 3: Get Friends Leaderboard

**Request:**
```http
GET /api/leaderboard/friends?limit=10 HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGc...
```

**Response (200 OK):**
```json
[
  {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "total_completions": 42,
    "current_streak": 7,
    "longest_streak": 15
  },
  {
    "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "total_completions": 38,
    "current_streak": 5,
    "longest_streak": 12
  }
]
```

---

## Validation Rules Documented

### Habit Validation
- `name`: Required, non-empty string
- `description`: Optional string

### User Profile Validation
- `username`: Required, 3-20 characters, pattern `^[a-z0-9_-]{3,20}$`
- `display_name`: Optional string

### Habit Log Validation
- `date`: Optional, ISO date format (YYYY-MM-DD), defaults to today
- `value`: Optional integer, defaults to 1

### Friend Request Validation
- `username`: Required, non-empty string
- Cannot send request to yourself
- Cannot send duplicate requests

---

## Testing with Swagger UI

### Step-by-Step Guide

1. **Obtain JWT Token:**
   - Log in through the frontend application
   - Open browser DevTools → Application → Local Storage
   - Find Supabase session data
   - Copy the `access_token` value

2. **Authorize in Swagger UI:**
   - Click the green "Authorize" button at the top
   - Paste token in the "Value" field
   - Click "Authorize", then "Close"

3. **Try an Endpoint:**
   - Expand any endpoint (e.g., GET /habits)
   - Click "Try it out"
   - Fill in any required parameters
   - Click "Execute"
   - View the response below

4. **Inspect Responses:**
   - Response body shows the actual JSON returned
   - Response headers show HTTP headers
   - Response code shows the status code

---

## Maintenance Guidelines

### Keeping OpenAPI Specs Up to Date

When adding or modifying endpoints:

1. **Update the OpenAPI YAML file** in the service directory
2. **Add/update schemas** if new data structures are introduced
3. **Document all parameters** including query params, path params, and request bodies
4. **Document all response codes** that the endpoint can return
5. **Add examples** for request and response bodies
6. **Test in Swagger UI** to ensure the documentation is accurate

### Validation Tools

Recommended tools for validating OpenAPI specs:
- [Swagger Editor](https://editor.swagger.io/) - Online validator
- `swagger-cli validate openapi.yaml` - CLI validation
- IDE plugins (e.g., OpenAPI extension for VS Code)

---

## API Versioning

**Current Version:** 1.0.0

The API does not currently use URL-based versioning (e.g., `/v1/`). Future breaking changes should consider:
- URL-based versioning (`/api/v2/...`)
- Header-based versioning (`Accept: application/vnd.habittracker.v2+json`)
- Maintaining backward compatibility where possible

---

## References

- **Habit Service OpenAPI Spec:** `habit-service/openapi.yaml`
- **User Service OpenAPI Spec:** `user-service/openapi.yaml`
- **OpenAPI 3.0 Specification:** https://spec.openapis.org/oas/v3.0.0
- **Swagger UI Documentation:** https://swagger.io/tools/swagger-ui/

---

**Document Version:** 1.0  
**Last Updated:** December 20, 2025  
**Status:** ✅ Complete - All endpoints documented and verified

