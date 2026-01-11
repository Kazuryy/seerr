# Testing Guide - Media Tracking & Reviews API

## Overview

Two automated testing scripts are available to verify the tracking API:

1. **TypeScript Test Suite** (`test-tracking-api.ts`) - Comprehensive test suite with detailed reporting
2. **Quick Bash Script** (`quick-test-api.sh`) - Fast shell-based tests

---

## Prerequisites

### 1. Start the Development Server

```bash
pnpm dev
```

Wait for the server to start on `http://localhost:5055`

### 2. Get Your Session Cookie

**Option A: Via Browser DevTools**

1. Login to Seerr at `http://localhost:5055`
2. Open DevTools (F12)
3. Go to Application → Cookies → `http://localhost:5055`
4. Copy the `connect.sid` value

**Option B: Via curl**

```bash
# Login via API (if you know credentials)
curl -X POST http://localhost:5055/api/v1/auth/local \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@seerr.local", "password": "your_password"}' \
  -c cookies.txt

# Extract cookie
cat cookies.txt | grep connect.sid
```

### 3. Ensure Test Data Exists

You need at least one media item in the database. Add media via:

- Seerr UI: Search and add a movie/TV show
- Or the test will fail with "No media found"

---

## Method 1: TypeScript Test Suite (Recommended)

### Run the Full Test Suite

```bash
# Set your session cookie
export SESSION_COOKIE="connect.sid=YOUR_COOKIE_VALUE"

# Run tests
ts-node -r tsconfig-paths/register --project server/tsconfig.json test-tracking-api.ts
```

### Features

✅ Comprehensive test coverage (50+ assertions)
✅ Colored output with detailed results
✅ Tests all 9 tracking endpoints
✅ Validation testing
✅ Automatic cleanup
✅ Detailed error reporting

### Example Output

```
╔═══════════════════════════════════════════════════════════╗
║   Media Tracking & Reviews API - Automated Test Suite   ║
╚═══════════════════════════════════════════════════════════╝

============================================================
Setup
============================================================
✓ Already authenticated
✓ Found test media with ID: 123

============================================================
Testing Watch History Endpoints
============================================================
✓ POST /tracking/watch returns 201 Created
✓ Response contains watch history ID
✓ Response contains watchedAt timestamp
✓ GET /tracking/watch returns 200 OK
✓ Response contains pageInfo
...

============================================================
Test Summary
============================================================
Total tests: 52
Passed: 52
Failed: 0
Pass rate: 100.0%

🎉 All tests passed! The tracking API is working correctly.
```

---

## Method 2: Quick Bash Script

### Run Quick Tests

```bash
# Option 1: Pass cookie as argument
./quick-test-api.sh "connect.sid=YOUR_COOKIE_VALUE"

# Option 2: Use environment variable
export SESSION_COOKIE="connect.sid=YOUR_COOKIE_VALUE"
./quick-test-api.sh
```

### Features

✅ Fast execution (~10 seconds)
✅ Requires only bash, curl, and jq
✅ Colored terminal output
✅ Tests core functionality
✅ JSON response formatting

### Example Output

```
╔═══════════════════════════════════════════════════════════╗
║      Quick API Test - Media Tracking & Reviews           ║
╚═══════════════════════════════════════════════════════════╝

Checking server connection...
✓ Server is running

Verifying authentication...
✓ Authenticated as user ID: 1

Finding test media...
✓ Using media ID: 456

=== Testing Watch History Endpoints ===

Testing POST /tracking/watch (mark movie as watched)... ✓ PASSED (Status: 201)
{
  "id": 789,
  "userId": 1,
  "mediaId": 456,
  "mediaType": "MOVIE",
  "watchedAt": "2026-01-11T12:00:00.000Z"
}
...

╔═══════════════════════════════════════════════════════════╗
║                     Test Summary                          ║
╚═══════════════════════════════════════════════════════════╝

Total tests: 14
Passed: 14
Failed: 0
Pass rate: 100%

🎉 All tests passed!
```

---

## What Gets Tested

### Watch History Endpoints (6 tests)

- ✅ Mark movie as watched
- ✅ Mark TV episode as watched with season/episode
- ✅ Get paginated watch history
- ✅ Filter watch history by media type
- ✅ Get watch history for specific media
- ✅ Delete watch history entry

### Review Endpoints (8 tests)

- ✅ Create review with rating and content
- ✅ Update review (upsert functionality)
- ✅ Create review with only rating
- ✅ Create review for TV season
- ✅ Get paginated reviews
- ✅ Filter reviews by media
- ✅ Get current user's review
- ✅ Delete review

### Stats Endpoint (1 test)

- ✅ Get user statistics
- ✅ Validate watchStats structure
- ✅ Validate reviewStats structure
- ✅ Verify rating distribution

### Validation (5 tests)

- ✅ Missing required fields returns 400
- ✅ Invalid rating (> 10) returns 400
- ✅ Invalid rating (< 1) returns 400
- ✅ Review without rating/content returns 400
- ✅ Invalid mediaType returns 400
- ✅ Pagination limits (take > 100) returns 400

---

## Troubleshooting

### Error: "Server is not running"

**Solution**: Start the development server

```bash
pnpm dev
```

### Error: "Authentication failed"

**Cause**: Session cookie is invalid or expired

**Solution**:

1. Login to Seerr again
2. Get a fresh `connect.sid` cookie
3. Update your `SESSION_COOKIE` environment variable

### Error: "No media found in database"

**Cause**: Database is empty

**Solution**:

1. Open Seerr at `http://localhost:5055`
2. Search for and add a movie or TV show
3. Run tests again

### Error: "ECONNREFUSED"

**Cause**: Server is not running or running on different port

**Solution**:

```bash
# Check if server is running
curl http://localhost:5055

# Or specify custom URL
BASE_URL=http://localhost:3000 ./quick-test-api.sh
```

### Tests pass but database looks empty

**Note**: Both test scripts automatically clean up after themselves:

- Delete created reviews
- Delete created watch history entries

This ensures tests are repeatable and don't pollute the database.

### DELETE endpoints return 405 "Method not allowed"

**Cause**: OpenAPI spec parameter type mismatch (fixed in latest version)

**Solution**: Restart the server to reload the OpenAPI spec

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

The fix changed path parameters from `type: number` to `type: integer` for DELETE endpoints to match Seerr's standard pattern.

---

## Manual Testing

### Using Swagger UI

1. Start the server: `pnpm dev`
2. Navigate to: `http://localhost:5055/api-docs`
3. Find the **tracking** section
4. Click "Authorize" and login
5. Test endpoints interactively

### Using curl Examples

See [TESTING_TRACKING_API.md](TESTING_TRACKING_API.md) for detailed curl examples.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Tracking API

on: [push, pull_request]

jobs:
  test-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build

      # Start server in background
      - run: pnpm start &
      - run: sleep 10

      # Create admin user and get session
      - name: Setup test user
        run: |
          # Initialize database and create user
          # ... (implement setup script)

      # Run tests
      - run: ts-node -r tsconfig-paths/register --project server/tsconfig.json test-tracking-api.ts
```

---

## Test Coverage Summary

| Category      | Endpoints | Tests  | Coverage |
| ------------- | --------- | ------ | -------- |
| Watch History | 4         | 15     | 100%     |
| Reviews       | 4         | 18     | 100%     |
| Stats         | 1         | 8      | 100%     |
| Validation    | -         | 11     | 100%     |
| **Total**     | **9**     | **52** | **100%** |

---

## Next Steps

Once all tests pass:

1. ✅ **Backend Validated** - API routes working correctly
2. 📋 **Start Frontend** - Build React components
3. 🎨 **UI Integration** - Connect components to API
4. 🧪 **E2E Tests** - Add Cypress tests for full user flows

---

## Related Documentation

- [API Routes Summary](API_ROUTES_SUMMARY.md) - Complete API documentation
- [Testing API Guide](TESTING_TRACKING_API.md) - Manual testing with curl
- [Feature Specification](FEATURE_TRACKING_REVIEWS.md) - Original requirements
- [Implementation Summary](PHASE1_IMPLEMENTATION_SUMMARY.md) - Backend implementation

---

_Testing guide created: 2026-01-11_
