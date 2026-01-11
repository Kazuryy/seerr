#!/bin/bash

# Quick API Testing Script for Media Tracking & Reviews
# Usage: ./quick-test-api.sh [SESSION_COOKIE]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5055}"
API_BASE="$BASE_URL/api/v1"

# Get session cookie from argument or environment
if [ -n "$1" ]; then
  COOKIE="$1"
elif [ -n "$SESSION_COOKIE" ]; then
  COOKIE="$SESSION_COOKIE"
else
  echo -e "${RED}Error: No session cookie provided${NC}"
  echo ""
  echo "Usage:"
  echo "  $0 'connect.sid=YOUR_COOKIE_VALUE'"
  echo ""
  echo "Or set environment variable:"
  echo "  export SESSION_COOKIE='connect.sid=YOUR_COOKIE_VALUE'"
  echo "  $0"
  echo ""
  echo -e "${YELLOW}To get your session cookie:${NC}"
  echo "  1. Login to Seerr at $BASE_URL"
  echo "  2. Open DevTools → Application → Cookies"
  echo "  3. Copy the 'connect.sid' value"
  exit 1
fi

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Quick API Test - Media Tracking & Reviews           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper functions
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"

  echo -ne "Testing ${name}... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" \
      -H "Cookie: $COOKIE" \
      -H "Content-Type: application/json")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
      -H "Cookie: $COOKIE" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint" \
      -H "Cookie: $COOKIE")
  fi

  # Extract status code (last line)
  status=$(echo "$response" | tail -n 1)
  # Extract body (all but last line)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Status: $status)"
    ((PASSED++))
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status)"
    ((FAILED++))
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  echo ""
}

# Check if server is running
echo -e "${CYAN}Checking server connection...${NC}"
if ! curl -s "$BASE_URL" > /dev/null; then
  echo -e "${RED}✗ Server is not running at $BASE_URL${NC}"
  echo "Please start the server with: pnpm dev"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Check authentication
echo -e "${CYAN}Verifying authentication...${NC}"
auth_response=$(curl -s -w "\n%{http_code}" "$API_BASE/auth/me" -H "Cookie: $COOKIE")
auth_status=$(echo "$auth_response" | tail -n 1)

if [ "$auth_status" != "200" ]; then
  echo -e "${RED}✗ Authentication failed (Status: $auth_status)${NC}"
  echo "Please check your session cookie"
  exit 1
fi

user_data=$(echo "$auth_response" | sed '$d')
user_id=$(echo "$user_data" | jq -r '.id' 2>/dev/null)
echo -e "${GREEN}✓ Authenticated as user ID: $user_id${NC}"
echo ""

# Find a test media
echo -e "${CYAN}Finding test media...${NC}"
media_response=$(curl -s "$API_BASE/media?take=1" -H "Cookie: $COOKIE")
media_id=$(echo "$media_response" | jq -r '.results[0].id' 2>/dev/null)
media_type=$(echo "$media_response" | jq -r '.results[0].mediaType' 2>/dev/null)

if [ "$media_id" = "null" ] || [ -z "$media_id" ]; then
  echo -e "${RED}✗ No media found in database${NC}"
  echo "Please add some media to test with"
  exit 1
fi

echo -e "${GREEN}✓ Using media ID: $media_id (type: $media_type)${NC}"
echo ""

# ==================== Watch History Tests ====================
echo -e "${CYAN}=== Testing Watch History Endpoints ===${NC}"
echo ""

# Test 1: Mark as watched
test_endpoint \
  "POST /tracking/watch (mark as watched)" \
  "POST" \
  "/tracking/watch" \
  "{\"mediaId\": $media_id, \"mediaType\": \"$media_type\"}" \
  "201"

# Get the watch ID from the last response for cleanup
watch_id=$(echo "$body" | jq -r '.id' 2>/dev/null)

# Test 2: Get watch history
test_endpoint \
  "GET /tracking/watch (get history)" \
  "GET" \
  "/tracking/watch?take=10" \
  "" \
  "200"

# Test 3: Get watch history for specific media
test_endpoint \
  "GET /tracking/watch/:mediaId (get history for media)" \
  "GET" \
  "/tracking/watch/$media_id" \
  "" \
  "200"

# Test 4: Mark TV episode as watched
test_endpoint \
  "POST /tracking/watch (mark TV episode as watched)" \
  "POST" \
  "/tracking/watch" \
  "{\"mediaId\": $media_id, \"mediaType\": \"tv\", \"seasonNumber\": 1, \"episodeNumber\": 1}" \
  "201"

# ==================== Review Tests ====================
echo -e "${CYAN}=== Testing Review Endpoints ===${NC}"
echo ""

# Test 5: Create review
test_endpoint \
  "POST /tracking/reviews (create review)" \
  "POST" \
  "/tracking/reviews" \
  "{\"mediaId\": $media_id, \"mediaType\": \"$media_type\", \"rating\": 8, \"content\": \"Test review from automated script\"}" \
  "201"

# Get the review ID from the last response for cleanup
review_id=$(echo "$body" | jq -r '.id' 2>/dev/null)

# Test 6: Update review (upsert)
test_endpoint \
  "POST /tracking/reviews (update review)" \
  "POST" \
  "/tracking/reviews" \
  "{\"mediaId\": $media_id, \"mediaType\": \"$media_type\", \"rating\": 9, \"content\": \"Updated test review\"}" \
  "200"

# Test 7: Get reviews
test_endpoint \
  "GET /tracking/reviews (get all reviews)" \
  "GET" \
  "/tracking/reviews?take=10" \
  "" \
  "200"

# Test 8: Get reviews for specific media
test_endpoint \
  "GET /tracking/reviews?mediaId (filter by media)" \
  "GET" \
  "/tracking/reviews?mediaId=$media_id" \
  "" \
  "200"

# Test 9: Get current user's review
test_endpoint \
  "GET /tracking/reviews/:mediaId/me (get my review)" \
  "GET" \
  "/tracking/reviews/$media_id/me" \
  "" \
  "200"

# ==================== Stats Tests ====================
echo -e "${CYAN}=== Testing Stats Endpoint ===${NC}"
echo ""

# Test 10: Get user stats
test_endpoint \
  "GET /tracking/stats/:userId (get user stats)" \
  "GET" \
  "/tracking/stats/$user_id" \
  "" \
  "200"

# ==================== Validation Tests ====================
echo -e "${CYAN}=== Testing Validation ===${NC}"
echo ""

# Test 11: Invalid rating (too high)
test_endpoint \
  "POST /tracking/reviews (invalid rating - too high)" \
  "POST" \
  "/tracking/reviews" \
  "{\"mediaId\": $media_id, \"mediaType\": \"$media_type\", \"rating\": 15}" \
  "400"

# Test 12: Missing required fields
test_endpoint \
  "POST /tracking/watch (missing required fields)" \
  "POST" \
  "/tracking/watch" \
  "{}" \
  "400"

# ==================== Cleanup ====================
echo -e "${CYAN}=== Cleanup ===${NC}"
echo ""

if [ -n "$review_id" ] && [ "$review_id" != "null" ]; then
  test_endpoint \
    "DELETE /tracking/reviews/:reviewId (cleanup review)" \
    "DELETE" \
    "/tracking/reviews/$review_id" \
    "" \
    "204"
fi

if [ -n "$watch_id" ] && [ "$watch_id" != "null" ]; then
  test_endpoint \
    "DELETE /tracking/watch/:watchId (cleanup watch)" \
    "DELETE" \
    "/tracking/watch/$watch_id" \
    "" \
    "204"
fi

# ==================== Summary ====================
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                     Test Summary                          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  PASS_RATE=$((PASSED * 100 / TOTAL))
else
  PASS_RATE=0
fi

echo -e "Total tests: ${CYAN}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Pass rate: ${CYAN}$PASS_RATE%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
  exit 1
fi
