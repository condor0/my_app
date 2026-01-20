# ============================================================================
# MICROSERVICES SMOKE TEST SCRIPT (PowerShell)
# ============================================================================
# Quick smoke test using Invoke-RestMethod to verify microservices are working
# Usage: .\test-microservices.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$GATEWAY_URL = if ($env:GATEWAY_URL) { $env:GATEWAY_URL } else { "http://localhost:3000" }
$TIMESTAMP = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$TEST_EMAIL = "smoke-test-$TIMESTAMP@example.com"

Write-Host "🔍 Microservices Smoke Test" -ForegroundColor Cyan
Write-Host "================================"
Write-Host "Gateway URL: $GATEWAY_URL"
Write-Host ""

function Test-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Test-Fail {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

# ============================================================================
# 1. Health Check
# ============================================================================
Write-Host "1. Testing Health Endpoint..."
try {
    $health = Invoke-RestMethod -Uri "$GATEWAY_URL/health" -Method Get
    if ($health.status -eq "ok") {
        Test-Success "Health check passed"
    } else {
        Test-Fail "Health check returned: $($health.status)"
    }
} catch {
    Test-Fail "Health check failed: $_"
}

# ============================================================================
# 2. Detailed Health (Service Connectivity)
# ============================================================================
Write-Host "2. Testing Service Connectivity..."
try {
    $detailed = Invoke-RestMethod -Uri "$GATEWAY_URL/health/detailed" -Method Get
    if ($detailed.services.auth) {
        Test-Success "Auth service connected"
    } else {
        Test-Fail "Auth service not connected"
    }
    if ($detailed.services.events) {
        Test-Success "Events service connected"
    } else {
        Test-Fail "Events service not connected"
    }
} catch {
    Test-Fail "Service connectivity check failed: $_"
}

# ============================================================================
# 3. User Signup
# ============================================================================
Write-Host "3. Testing User Signup..."
try {
    $signupBody = @{
        email = $TEST_EMAIL
        password = "TestPass123!"
        name = "Smoke Test"
    } | ConvertTo-Json

    $signup = Invoke-RestMethod -Uri "$GATEWAY_URL/auth/signup" -Method Post -Body $signupBody -ContentType "application/json"
    Test-Success "User signup passed"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 409) {
        Write-Host "  (User already exists - continuing)" -ForegroundColor Yellow
    } else {
        Test-Fail "User signup failed: $_"
    }
}

# ============================================================================
# 4. User Login
# ============================================================================
Write-Host "4. Testing User Login..."
try {
    $loginBody = @{
        email = $TEST_EMAIL
        password = "TestPass123!"
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$GATEWAY_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    if ($login.accessToken) {
        Test-Success "User login passed"
        $TOKEN = $login.accessToken
    } else {
        Test-Fail "Login did not return accessToken"
    }
} catch {
    Test-Fail "User login failed: $_"
}

# ============================================================================
# 5. Get Profile (Authenticated)
# ============================================================================
Write-Host "5. Testing Authenticated Profile..."
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    $profile = Invoke-RestMethod -Uri "$GATEWAY_URL/auth/profile" -Method Get -Headers $headers
    
    if ($profile.email -eq $TEST_EMAIL) {
        Test-Success "Profile retrieval passed"
    } else {
        Test-Fail "Profile email mismatch"
    }
} catch {
    Test-Fail "Profile retrieval failed: $_"
}

# ============================================================================
# 6. List Events (Authenticated)
# ============================================================================
Write-Host "6. Testing Events List..."
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    $events = Invoke-RestMethod -Uri "$GATEWAY_URL/events" -Method Get -Headers $headers
    
    if ($null -ne $events.data) {
        Test-Success "Events list passed (found $($events.data.Count) events)"
    } else {
        Test-Fail "Events response missing data field"
    }
} catch {
    Test-Fail "Events list failed: $_"
}

# ============================================================================
# 7. Swagger Documentation
# ============================================================================
Write-Host "7. Testing Swagger Documentation..."
try {
    $swagger = Invoke-WebRequest -Uri "$GATEWAY_URL/api" -Method Get
    if ($swagger.Content -match "swagger") {
        Test-Success "Swagger docs available"
    } else {
        Test-Fail "Swagger docs not found"
    }
} catch {
    Test-Fail "Swagger check failed: $_"
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "================================"
Write-Host "All smoke tests passed!" -ForegroundColor Green
Write-Host "================================"
Write-Host ""
Write-Host "Services verified:"
Write-Host "  - API Gateway (HTTP $GATEWAY_URL)"
Write-Host "  - Auth Service (TCP :3001)"
Write-Host "  - Events Service (TCP :3002)"
Write-Host ""
