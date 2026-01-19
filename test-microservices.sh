#!/bin/bash
# ============================================================================
# MICROSERVICES SMOKE TEST SCRIPT
# ============================================================================
# Quick smoke test using curl to verify microservices are working
# Usage: ./test-microservices.sh
# ============================================================================

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="smoke-test-${TIMESTAMP}@example.com"

echo "🔍 Microservices Smoke Test"
echo "================================"
echo "Gateway URL: $GATEWAY_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

fail() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# ============================================================================
# 1. Health Check
# ============================================================================
echo "1. Testing Health Endpoint..."
HEALTH=$(curl -s "$GATEWAY_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    success "Health check passed"
else
    fail "Health check failed: $HEALTH"
fi

# ============================================================================
# 2. Detailed Health (Service Connectivity)
# ============================================================================
echo "2. Testing Service Connectivity..."
DETAILED=$(curl -s "$GATEWAY_URL/health/detailed")
if echo "$DETAILED" | grep -q '"auth"'; then
    success "Auth service connected"
else
    fail "Auth service not connected: $DETAILED"
fi

if echo "$DETAILED" | grep -q '"events"'; then
    success "Events service connected"
else
    fail "Events service not connected: $DETAILED"
fi

# ============================================================================
# 3. User Signup
# ============================================================================
echo "3. Testing User Signup..."
SIGNUP=$(curl -s -X POST "$GATEWAY_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\",\"name\":\"Smoke Test\"}")

if echo "$SIGNUP" | grep -q "registered"; then
    success "User signup passed"
else
    fail "User signup failed: $SIGNUP"
fi

# ============================================================================
# 4. User Login
# ============================================================================
echo "4. Testing User Login..."
LOGIN=$(curl -s -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}")

if echo "$LOGIN" | grep -q "accessToken"; then
    success "User login passed"
    TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    fail "User login failed: $LOGIN"
fi

# ============================================================================
# 5. Get Profile (Authenticated)
# ============================================================================
echo "5. Testing Authenticated Profile..."
PROFILE=$(curl -s "$GATEWAY_URL/auth/profile" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE" | grep -q "$TEST_EMAIL"; then
    success "Profile retrieval passed"
else
    fail "Profile retrieval failed: $PROFILE"
fi

# ============================================================================
# 6. List Events (Authenticated)
# ============================================================================
echo "6. Testing Events List..."
EVENTS=$(curl -s "$GATEWAY_URL/events" \
    -H "Authorization: Bearer $TOKEN")

if echo "$EVENTS" | grep -q '"data"'; then
    success "Events list passed"
else
    fail "Events list failed: $EVENTS"
fi

# ============================================================================
# 7. Swagger Documentation
# ============================================================================
echo "7. Testing Swagger Documentation..."
SWAGGER=$(curl -s "$GATEWAY_URL/api")
if echo "$SWAGGER" | grep -q "swagger"; then
    success "Swagger docs available"
else
    fail "Swagger docs not found"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "================================"
echo -e "${GREEN}All smoke tests passed!${NC}"
echo "================================"
echo ""
echo "Services verified:"
echo "  - API Gateway (HTTP $GATEWAY_URL)"
echo "  - Auth Service (TCP :3001)"
echo "  - Events Service (TCP :3002)"
echo ""
