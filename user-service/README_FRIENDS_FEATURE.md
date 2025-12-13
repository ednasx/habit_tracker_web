# Friends Feature Implementation

## Overview
This document describes the new username-based friend request system implemented in the user-service.

## What's New

### 1. Username System
- Users can now set a **unique username** (3-20 characters, lowercase letters, numbers, underscores, hyphens)
- Usernames are required and must be set via `POST /api/users/profile`
- Users can search for other users by username
- Username format validation is enforced

### 2. Friend Request System
- **Two-way acceptance required**: When User A sends a friend request to User B, User B must accept before they become friends
- Friend request statuses:
  - `pending` - Request sent but not yet accepted
  - `accepted` - Both users are now friends
  - `rejected` - Request was declined

### 3. New API Endpoints

#### Profile Management
```
GET  /api/users/profile          - Get current user's profile
POST /api/users/profile          - Create/update profile (set username)
GET  /api/users/search?q=john    - Search users by username
```

#### Friend Management
```
GET  /api/users/friends                      - List accepted friends
GET  /api/users/friends/pending              - List pending requests (received)
GET  /api/users/friends/sent                 - List sent requests
POST /api/users/friends/request              - Send friend request by username
POST /api/users/friends/:friendId/accept     - Accept friend request
POST /api/users/friends/:friendId/reject     - Reject friend request
DELETE /api/users/friends/:friendId          - Remove friend
```

## Database Changes

### Updated Tables

#### `user_profiles`
```sql
- user_id (uuid, PK)
- username (text, UNIQUE, NOT NULL) ← NEW
- display_name (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz) ← NEW
```

#### `friends`
```sql
- user_id (uuid, PK)
- friend_id (uuid, PK)
- status (text, NOT NULL) ← NEW (pending/accepted/rejected)
- created_at (timestamptz)
- updated_at (timestamptz) ← NEW
```

## Migration Instructions

1. **Run the migration SQL**:
   ```bash
   # In Supabase SQL Editor, run:
   habit_tracker_web/user-service/migrations/001_add_username_and_friend_requests.sql
   ```

2. **Existing Users**: If you have existing users without usernames, they'll need to set one on their next login via `POST /api/users/profile`

3. **Existing Friendships**: Any existing friendships will be automatically updated to `accepted` status

## API Usage Examples

### 1. Create/Update User Profile (Set Username)
```bash
POST /api/users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "username": "john_doe",
  "display_name": "John Doe"
}
```

Response:
```json
{
  "user_id": "91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b",
  "username": "john_doe",
  "display_name": "John Doe",
  "created_at": "2025-12-05T10:15:30.000Z",
  "updated_at": "2025-12-05T10:15:30.000Z"
}
```

### 2. Search for Users
```bash
GET /api/users/search?q=jane
Authorization: Bearer <JWT_TOKEN>
```

Response:
```json
[
  {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "jane_smith",
    "display_name": "Jane Smith"
  }
]
```

### 3. Send Friend Request
```bash
POST /api/users/friends/request
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "username": "jane_smith"
}
```

Response:
```json
{
  "message": "Friend request sent",
  "request": {
    "friend_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "jane_smith",
    "status": "pending",
    "created_at": "2025-12-05T10:20:00.000Z"
  }
}
```

### 4. View Pending Requests
```bash
GET /api/users/friends/pending
Authorization: Bearer <JWT_TOKEN>
```

Response:
```json
[
  {
    "user_id": "91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b",
    "username": "john_doe",
    "display_name": "John Doe",
    "created_at": "2025-12-05T10:20:00.000Z"
  }
]
```

### 5. Accept Friend Request
```bash
POST /api/users/friends/91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b/accept
Authorization: Bearer <JWT_TOKEN>
```

Response:
```json
{
  "message": "Friend request accepted",
  "friendship": {
    "user_id": "91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b",
    "friend_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "accepted",
    "updated_at": "2025-12-05T10:25:00.000Z"
  }
}
```

### 6. List Friends
```bash
GET /api/users/friends
Authorization: Bearer <JWT_TOKEN>
```

Response:
```json
[
  {
    "user_id": "91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b",
    "username": "john_doe",
    "display_name": "John Doe"
  },
  {
    "user_id": "xyz789-...",
    "username": "alice_wonder",
    "display_name": "Alice"
  }
]
```

### 7. Remove Friend
```bash
DELETE /api/users/friends/91b6a89b-2a93-4cf3-bb8a-44ba1a6d3e4b
Authorization: Bearer <JWT_TOKEN>
```

Response: `204 No Content`

## Frontend Integration Notes

### User Onboarding Flow
1. User signs up/logs in via email (Supabase Auth)
2. Check if user has a profile: `GET /api/users/profile`
3. If 404, show username setup screen
4. User submits username: `POST /api/users/profile`
5. Proceed to main app

### Friend Discovery Flow
1. User types in search box
2. Call `GET /api/users/search?q={query}` 
3. Display results with "Add Friend" button
4. Click button → `POST /api/users/friends/request` with username
5. Show "Request Sent" state

### Friend Request Management
1. Show notification badge for pending requests
2. Fetch: `GET /api/users/friends/pending`
3. User can Accept or Reject each request
4. Accept: `POST /api/users/friends/{friendId}/accept`
5. Reject: `POST /api/users/friends/{friendId}/reject`

## Validation Rules

### Username
- **Length**: 3-20 characters
- **Characters**: Lowercase letters (a-z), numbers (0-9), underscores (_), hyphens (-)
- **Uniqueness**: Must be unique across all users
- **Examples**:
  - ✅ `john_doe`
  - ✅ `alice123`
  - ✅ `bob-smith`
  - ❌ `Jo` (too short)
  - ❌ `John_Doe` (uppercase not allowed)
  - ❌ `john.doe` (period not allowed)

## Error Handling

### Common Error Responses

**400 Bad Request**
```json
{
  "message": "Username must be 3-20 characters, lowercase letters, numbers, underscores, or hyphens only"
}
```

**404 Not Found**
```json
{
  "message": "User not found"
}
```

**409 Conflict**
```json
{
  "message": "Username is already taken"
}
```
or
```json
{
  "message": "Friend request already sent"
}
```
or
```json
{
  "message": "This user has already sent you a friend request. Please accept it instead."
}
```

## RabbitMQ Events

The service publishes the following friendship events:
- `request_sent` - When a friend request is sent
- `accepted` - When a friend request is accepted
- `rejected` - When a friend request is rejected
- `removed` - When a friendship is removed

These events can be consumed by other services (e.g., analytics-service) for notifications or statistics.

## Testing

Run the user-service tests:
```bash
cd habit_tracker_web/user-service
npm test
```

## Documentation

- **API Documentation**: Available at `http://localhost:4001/api/docs` when running the service
- **Database Schema**: See `habit_tracker_web/docs/database-schema.md`
- **OpenAPI Spec**: See `habit_tracker_web/user-service/openapi.yaml`

