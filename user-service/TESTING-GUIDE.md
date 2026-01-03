# User Service - Testing Guide

This guide helps you test the user service thoroughly to ensure everything works correctly.

---

## 🚀 **Quick Start**

### Prerequisites

1. **Supabase Database Setup**
   - Ensure `user_profiles` and `friends` tables exist
   - RLS policies are enabled
   - See `habit_tracker_web/docs/REQ9-database-schema-documentation.md` for schema

2. **Environment Variables**
   
   Create a `.env` file in `user-service/` directory:
   
   ```bash
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   
   # RabbitMQ Configuration (optional, service works without it)
   RABBITMQ_URL=amqp://localhost:5672
   RABBITMQ_HABIT_EXCHANGE=habit.events
   
   # Service Configuration
   PORT=4001
   NODE_ENV=development
   SERVICE_NAME=user-service
   SERVICE_VERSION=1.0.0
   ```

3. **Install Dependencies**
   ```bash
   cd habit_tracker_web/user-service
   npm install
   ```

---

## 🧪 **Testing Methods**

### Method 1: Automated Tests (Recommended First)

Run the built-in test suite:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

**Expected Output:**
- All tests should pass (green ✓)
- Coverage should be > 50%

---

### Method 2: PowerShell Testing Script

Use the provided PowerShell script for comprehensive API testing:

```powershell
# 1. Start the user service
npm run dev

# 2. In a new terminal, run the test script
.\test-user-service.ps1
```

**Before running:**
- Get a JWT token from the frontend (see instructions in script)
- Replace `YOUR_JWT_TOKEN_HERE` with your actual token

**What it tests:**
- ✓ Health check
- ✓ Metrics endpoint
- ✓ User profile CRUD
- ✓ User search
- ✓ Friends list
- ✓ Friend requests (pending & sent)
- ✓ Error handling

---

### Method 3: HTTP File (VS Code REST Client)

If you have the REST Client extension in VS Code:

1. Open `test-user-service.http`
2. Replace `YOUR_JWT_TOKEN_HERE` with your JWT
3. Click "Send Request" above each test

---

### Method 4: Swagger UI (Interactive)

Best for manual exploration:

1. Start the service: `npm run dev`
2. Open browser: **http://localhost:4001/api/docs**
3. Click **"Authorize"** button
4. Paste your JWT token
5. Try endpoints interactively

---

## 📋 **Manual Testing Checklist**

### Step 1: Service Health

```bash
# Health check
curl http://localhost:4001/api/health

# Expected: {"status":"ok","service":"user-service"}
```

```bash
# Metrics check
curl http://localhost:4001/metrics

# Expected: Prometheus metrics output
```

---

### Step 2: Get JWT Token

1. Start your frontend: `cd habit_tracker_web/frontend && npm run dev`
2. Open: `http://localhost:5173`
3. Sign up or log in
4. Open DevTools (F12) → Application → Local Storage
5. Find Supabase session → Copy `access_token`
6. Use this token for all protected endpoints

---

### Step 3: User Profile Tests

```bash
# Set your token
$TOKEN = "your_jwt_token_here"

# Test 1: Get profile (might return 404 if not created)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4001/api/users/profile

# Test 2: Create profile
curl -X POST http://localhost:4001/api/users/profile `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"username":"test_user","display_name":"Test User"}'

# Test 3: Get profile again (should now return your profile)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4001/api/users/profile
```

**Expected Results:**
- First GET: 404 (profile doesn't exist yet)
- POST: 201 with profile data
- Second GET: 200 with profile data

---

### Step 4: User Search Tests

```bash
# Search for users with "test" in username
curl -H "Authorization: Bearer $TOKEN" `
  "http://localhost:4001/api/users/search?q=test"

# Expected: Array of matching users
```

**Test Cases:**
- [x] Search returns matching users
- [x] Search is case-insensitive
- [x] Minimum 2 characters required
- [x] Returns max 20 results

---

### Step 5: Friend System Tests

#### Get Friends Lists

```bash
# Get accepted friends
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:4001/api/users/friends

# Get pending requests (received)
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:4001/api/users/friends/pending

# Get sent requests
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:4001/api/users/friends/sent
```

#### Send Friend Request

```bash
# Send friend request to another user
curl -X POST http://localhost:4001/api/users/friends/request `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"username":"another_user"}'

# Expected: 201 with request details
```

#### Accept Friend Request

```bash
# Replace FRIEND_USER_ID with actual UUID
curl -X POST "http://localhost:4001/api/users/friends/FRIEND_USER_ID/accept" `
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with friendship details
```

#### Reject Friend Request

```bash
# Replace FRIEND_USER_ID with actual UUID
curl -X POST "http://localhost:4001/api/users/friends/FRIEND_USER_ID/reject" `
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with friendship details
```

#### Remove Friend

```bash
# Replace FRIEND_USER_ID with actual UUID
curl -X DELETE "http://localhost:4001/api/users/friends/FRIEND_USER_ID" `
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content
```

---

### Step 6: Error Handling Tests

```bash
# Test 1: Missing auth token
curl http://localhost:4001/api/users/profile
# Expected: 401 Unauthorized

# Test 2: Invalid token
curl -H "Authorization: Bearer invalid_token" `
  http://localhost:4001/api/users/profile
# Expected: 401 Unauthorized

# Test 3: Invalid username (too short)
curl -X POST http://localhost:4001/api/users/profile `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"username":"ab"}'
# Expected: 400 Bad Request

# Test 4: Invalid username format (spaces)
curl -X POST http://localhost:4001/api/users/profile `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"username":"user name"}'
# Expected: 400 Bad Request

# Test 5: Search without query
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:4001/api/users/search
# Expected: 400 Bad Request
```

---

## 🔄 **End-to-End Friend Flow Test**

Test the complete friend request flow with 2 users:

### Scenario: User A sends request to User B

```bash
# ===== User A Actions =====
# 1. User A creates profile
$TOKEN_A = "user_a_jwt_token"
curl -X POST http://localhost:4001/api/users/profile `
  -H "Authorization: Bearer $TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"username":"user_a","display_name":"User A"}'

# 2. User A searches for User B
curl -H "Authorization: Bearer $TOKEN_A" `
  "http://localhost:4001/api/users/search?q=user_b"

# 3. User A sends friend request to User B
curl -X POST http://localhost:4001/api/users/friends/request `
  -H "Authorization: Bearer $TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"username":"user_b"}'

# 4. User A checks sent requests
curl -H "Authorization: Bearer $TOKEN_A" `
  http://localhost:4001/api/users/friends/sent
# Should show request to user_b


# ===== User B Actions =====
# 5. User B checks pending requests
$TOKEN_B = "user_b_jwt_token"
curl -H "Authorization: Bearer $TOKEN_B" `
  http://localhost:4001/api/users/friends/pending
# Should show request from user_a

# 6. User B accepts request
$USER_A_ID = "user_a_uuid_here"
curl -X POST "http://localhost:4001/api/users/friends/$USER_A_ID/accept" `
  -H "Authorization: Bearer $TOKEN_B"

# 7. User B checks friends list
curl -H "Authorization: Bearer $TOKEN_B" `
  http://localhost:4001/api/users/friends
# Should show user_a as friend


# ===== Verify Both Sides =====
# 8. User A checks friends list
curl -H "Authorization: Bearer $TOKEN_A" `
  http://localhost:4001/api/users/friends
# Should show user_b as friend
```

---

## 📊 **Monitoring & Metrics**

### Check Prometheus Metrics

```bash
# View all metrics
curl http://localhost:4001/metrics

# Key metrics to look for:
# - total_users{service="user-service"}
# - friend_requests_sent_total
# - friend_requests_accepted_total
# - http_requests_total
# - http_request_duration_seconds
```

### Metrics During Testing

Watch metrics change as you test:

```powershell
# Monitor total users
while ($true) {
  $metrics = curl http://localhost:4001/metrics
  $metrics | Select-String "total_users"
  Start-Sleep -Seconds 2
}
```

---

## 🐛 **Troubleshooting**

### Issue: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"

**Solution:** Create `.env` file with proper values (see Prerequisites section)

---

### Issue: "Missing Authorization header" (401)

**Solution:** 
- Check that you're sending `Authorization: Bearer <token>` header
- Verify token is valid (not expired)
- Get a fresh token from frontend

---

### Issue: "Profile not found" (404)

**Solution:** Create profile first using POST /users/profile

---

### Issue: "Username is already taken" (409)

**Solution:** Use a different username or update your existing profile

---

### Issue: "RabbitMQ connection failed"

**Solution:** This is non-critical. Service works without RabbitMQ. To fix:
- Start RabbitMQ: `docker run -d --name rabbitmq -p 5672:5672 rabbitmq:3`
- Or set `RABBITMQ_URL` to existing RabbitMQ instance

---

### Issue: Tests failing

**Solution:**
1. Check Supabase connection (URL, keys)
2. Verify tables exist in Supabase
3. Check RLS policies are enabled
4. Run tests with: `NODE_ENV=test npm test`

---

## ✅ **Success Criteria**

Your user service is working correctly if:

- [x] Health check returns OK
- [x] Metrics endpoint returns Prometheus format
- [x] Can create user profile
- [x] Can search for users
- [x] Can send friend requests
- [x] Can accept/reject requests
- [x] Can list friends
- [x] Can remove friendships
- [x] Unauthorized requests return 401
- [x] Invalid data returns 400
- [x] All automated tests pass
- [x] Swagger UI is accessible

---

## 📚 **Additional Resources**

- **API Documentation:** http://localhost:4001/api/docs
- **Schema Documentation:** `habit_tracker_web/docs/REQ9-database-schema-documentation.md`
- **Authorization Documentation:** `habit_tracker_web/docs/REQ21-authorization-role-based.md`
- **Code Review:** `USER-SERVICE-REVIEW.md`

---

## 🎯 **Next Steps After Testing**

1. **Integration Testing**
   - Test with habit-service leaderboard endpoint
   - Test with frontend friend features

2. **Performance Testing**
   - Use k6 or Apache Bench for load testing
   - Monitor metrics under load

3. **Production Deployment**
   - Update environment variables for production
   - Set up monitoring/alerting
   - Configure HTTPS/TLS

---

**Happy Testing! 🚀**

For questions or issues, check the code review document or consult the OpenAPI specification.

