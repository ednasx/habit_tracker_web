# User Service Testing Script for PowerShell
# Run this script to test all user service endpoints

# Configuration
$BASE_URL = "http://localhost:4001/api"
$TOKEN = "YOUR_JWT_TOKEN_HERE"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "  User Service API Testing Script" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Info "Test 1: Health Check (No Auth)"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Success "✓ Health Check: $($response.status) - $($response.service)"
} catch {
    Write-Error "✗ Health Check Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 2: Metrics Endpoint
Write-Info "Test 2: Metrics Endpoint (No Auth)"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4001/metrics" -Method Get
    $lineCount = ($response.Content -split "`n").Count
    Write-Success "✓ Metrics Retrieved: $lineCount lines"
} catch {
    Write-Error "✗ Metrics Failed: $($_.Exception.Message)"
}
Write-Host ""

# Check if token is set
if ($TOKEN -eq "YOUR_JWT_TOKEN_HERE") {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "  IMPORTANT: Set your JWT token first!" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get a JWT token:"
    Write-Host "1. Log in through the frontend (http://localhost:5173)"
    Write-Host "2. Open DevTools → Application → Local Storage"
    Write-Host "3. Find Supabase session → Copy 'access_token'"
    Write-Host "4. Replace YOUR_JWT_TOKEN_HERE in this script"
    Write-Host ""
    Write-Host "Then run this script again."
    Write-Host ""
    exit
}

# Test 3: Get User Profile
Write-Info "Test 3: Get User Profile"
try {
    $headers = @{ "Authorization" = "Bearer $TOKEN" }
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/profile" -Method Get -Headers $headers
    Write-Success "✓ Profile Retrieved: $($response.username)"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "  → Profile not found (create one with Test 4)" -ForegroundColor Yellow
    } else {
        Write-Error "✗ Get Profile Failed: $($_.Exception.Message)"
    }
}
Write-Host ""

# Test 4: Create/Update User Profile
Write-Info "Test 4: Create/Update User Profile"
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    $body = @{
        username = "test_user_$(Get-Random -Maximum 9999)"
        display_name = "Test User"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/profile" -Method Post -Headers $headers -Body $body
    Write-Success "✓ Profile Created/Updated: $($response.username)"
    Write-Host "  → Username: $($response.username)" -ForegroundColor Gray
    Write-Host "  → Display Name: $($response.display_name)" -ForegroundColor Gray
} catch {
    Write-Error "✗ Create Profile Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 5: Search Users
Write-Info "Test 5: Search Users by Username"
try {
    $headers = @{ "Authorization" = "Bearer $TOKEN" }
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/search?q=test" -Method Get -Headers $headers
    Write-Success "✓ Search Complete: Found $($response.Count) users"
    foreach ($user in $response | Select-Object -First 3) {
        Write-Host "  → $($user.username) ($($user.display_name))" -ForegroundColor Gray
    }
} catch {
    Write-Error "✗ Search Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 6: Get Friends List
Write-Info "Test 6: Get Accepted Friends"
try {
    $headers = @{ "Authorization" = "Bearer $TOKEN" }
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/friends" -Method Get -Headers $headers
    Write-Success "✓ Friends Retrieved: $($response.Count) friends"
    if ($response.Count -gt 0) {
        foreach ($friend in $response) {
            Write-Host "  → $($friend.username)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  → No friends yet" -ForegroundColor Yellow
    }
} catch {
    Write-Error "✗ Get Friends Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 7: Get Pending Friend Requests
Write-Info "Test 7: Get Pending Friend Requests (Received)"
try {
    $headers = @{ "Authorization" = "Bearer $TOKEN" }
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/friends/pending" -Method Get -Headers $headers
    Write-Success "✓ Pending Requests Retrieved: $($response.Count) requests"
    if ($response.Count -gt 0) {
        foreach ($request in $response) {
            Write-Host "  → From: $($request.username)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  → No pending requests" -ForegroundColor Yellow
    }
} catch {
    Write-Error "✗ Get Pending Requests Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 8: Get Sent Friend Requests
Write-Info "Test 8: Get Sent Friend Requests"
try {
    $headers = @{ "Authorization" = "Bearer $TOKEN" }
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/friends/sent" -Method Get -Headers $headers
    Write-Success "✓ Sent Requests Retrieved: $($response.Count) requests"
    if ($response.Count -gt 0) {
        foreach ($request in $response) {
            Write-Host "  → To: $($request.username)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  → No sent requests" -ForegroundColor Yellow
    }
} catch {
    Write-Error "✗ Get Sent Requests Failed: $($_.Exception.Message)"
}
Write-Host ""

# Test 9: Error Handling - Missing Auth
Write-Info "Test 9: Error Handling - Missing Auth Token"
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/profile" -Method Get
    Write-Error "✗ Should have returned 401"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Success "✓ Correctly returned 401 Unauthorized"
    } else {
        Write-Error "✗ Unexpected error: $($_.Exception.Message)"
    }
}
Write-Host ""

# Test 10: Error Handling - Invalid Username
Write-Info "Test 10: Error Handling - Invalid Username Format"
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    $body = @{
        username = "ab"  # Too short
        display_name = "Too Short"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/users/profile" -Method Post -Headers $headers -Body $body
    Write-Error "✗ Should have returned 400"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Success "✓ Correctly returned 400 Bad Request"
    } else {
        Write-Error "✗ Unexpected error: $($_.Exception.Message)"
    }
}
Write-Host ""

# Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "  Testing Complete!" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check Swagger UI: http://localhost:4001/api/docs"
Write-Host "2. Test friend request flow with 2 users"
Write-Host "3. Run automated tests: npm test"
Write-Host "4. Check metrics: http://localhost:4001/metrics"
Write-Host ""

