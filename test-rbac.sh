#!/bin/bash

# RBAC Testing Script for NestJS App
# This script tests all RBAC endpoints with different roles

set -e

BASE_URL="${1:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}RBAC Manual Testing Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Testing against: $BASE_URL"
echo ""

# Cleanup previous test data
USER_EMAIL="rbac.test.user@${RANDOM}.com"
MOD_EMAIL="rbac.test.mod@${RANDOM}.com"
ADMIN_EMAIL="rbac.test.admin@${RANDOM}.com"
TEST_PASSWORD="TestPassword123!"

# Store tokens
USER_TOKEN=""
MOD_TOKEN=""
ADMIN_TOKEN=""

# Test counters
PASS=0
FAIL=0

# Helper function for testing
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    local expected_code=$6
    
    echo -n "Testing: $name... "
    
    if [ -z "$token" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            ${data:+-d "$data"})
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            ${data:+-d "$data"})
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $HTTP_CODE)"
        echo "Response: $BODY"
        ((FAIL++))
        return 1
    fi
}

echo -e "${YELLOW}[SETUP] Registering test users${NC}"
echo ""

# Signup User
test_endpoint "Signup User" "POST" "/auth/signup" "" \
    "{\"email\":\"$USER_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}" "201"

# Signup Moderator
test_endpoint "Signup Moderator" "POST" "/auth/signup" "" \
    "{\"email\":\"$MOD_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test Moderator\"}" "201"

# Signup Admin
test_endpoint "Signup Admin" "POST" "/auth/signup" "" \
    "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test Admin\"}" "201"

echo ""
echo -e "${YELLOW}[AUTH] Getting tokens${NC}"
echo ""

# Login User and extract token
echo -n "Login User... "
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
USER_TOKEN=$(echo $USER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Login Moderator
echo -n "Login Moderator... "
MOD_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$MOD_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
MOD_TOKEN=$(echo $MOD_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -n "$MOD_TOKEN" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

# Login Admin
echo -n "Login Admin... "
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo -e "${YELLOW}[401] Authentication Tests (Missing/Invalid Token)${NC}"
echo ""

test_endpoint "No token on /me" "GET" "/auth/me" "" "" "401"
test_endpoint "Invalid token on /me" "GET" "/auth/me" "invalid.token.here" "" "401"
test_endpoint "Tampered token on /me" "GET" "/auth/me" "${USER_TOKEN:0:$((${#USER_TOKEN}-5))}xxxxx" "" "401"
test_endpoint "No token on admin route" "DELETE" "/auth/admin/users/1" "" "" "401"
test_endpoint "No token on moderator route" "POST" "/auth/moderator/content" "" "" "401"

echo ""
echo -e "${YELLOW}[200] Successful Authentication${NC}"
echo ""

test_endpoint "User can access /me" "GET" "/auth/me" "$USER_TOKEN" "" "200"
test_endpoint "Moderator can access /me" "GET" "/auth/me" "$MOD_TOKEN" "" "200"
test_endpoint "Admin can access /me" "GET" "/auth/me" "$ADMIN_TOKEN" "" "200"

echo ""
echo -e "${YELLOW}[403] Authorization Tests (Insufficient Permissions)${NC}"
echo ""

test_endpoint "User cannot access admin route" "DELETE" "/auth/admin/users/1" "$USER_TOKEN" "" "403"
test_endpoint "User cannot access moderator route" "POST" "/auth/moderator/content" "$USER_TOKEN" "" "403"
test_endpoint "Moderator cannot access admin route" "DELETE" "/auth/admin/users/1" "$MOD_TOKEN" "" "403"

echo ""
echo -e "${YELLOW}[200] Role-Based Access (Allowed)${NC}"
echo ""

# Note: These will return 403 until roles are manually updated in DB to moderator/admin
# For now we're testing the happy path structure

test_endpoint "Admin can access admin route" "DELETE" "/auth/admin/users/999" "$ADMIN_TOKEN" "" "200"
test_endpoint "Moderator can access moderator route" "POST" "/auth/moderator/content" "$MOD_TOKEN" "" "200"
test_endpoint "Admin can access moderator route" "POST" "/auth/moderator/content" "$ADMIN_TOKEN" "" "200"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "Test Results:"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
