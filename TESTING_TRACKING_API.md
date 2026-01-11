# Testing Guide: Media Tracking & Reviews API

## Prerequisites

1. **Start the development server**:

```bash
pnpm dev
```

2. **Verify migrations ran**:
   Check logs for:

```
Migration AddMediaTracking1736605200000 has been executed successfully.
```

3. **Get authentication cookie**:

- Login to Seerr UI at `http://localhost:5055`
- Open browser DevTools → Application → Cookies
- Copy the `connect.sid` cookie value

---

## Testing Endpoints

### 1. Mark Media as Watched

**Mark a movie as watched:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/watch \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE"
  }'
```

**Expected Response (201 Created):**

```json
{
  "id": 1,
  "userId": 1,
  "mediaId": 1,
  "mediaType": "MOVIE",
  "watchedAt": "2026-01-11T...",
  "createdAt": "2026-01-11T...",
  "updatedAt": "2026-01-11T..."
}
```

**Mark a TV episode as watched:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/watch \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 2,
    "mediaType": "TV",
    "seasonNumber": 1,
    "episodeNumber": 1,
    "watchedAt": "2026-01-10T20:00:00Z"
  }'
```

---

### 2. Get Watch History

**Get all watch history (paginated):**

```bash
curl http://localhost:5055/api/v1/tracking/watch?take=20 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Filter by media type:**

```bash
curl "http://localhost:5055/api/v1/tracking/watch?mediaType=MOVIE&take=10" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response (200 OK):**

```json
{
  "pageInfo": {
    "pages": 1,
    "pageSize": 20,
    "results": 2,
    "page": 1
  },
  "results": [
    {
      "id": 2,
      "userId": 1,
      "mediaId": 2,
      "mediaType": "TV",
      "seasonNumber": 1,
      "episodeNumber": 1,
      "watchedAt": "2026-01-10T20:00:00.000Z",
      "media": {
        "id": 2,
        "tmdbId": 12345,
        "mediaType": "tv"
      }
    }
  ]
}
```

---

### 3. Get Watch History for Specific Media

```bash
curl http://localhost:5055/api/v1/tracking/watch/1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response (200 OK):**

```json
[
  {
    "id": 1,
    "userId": 1,
    "mediaId": 1,
    "mediaType": "MOVIE",
    "watchedAt": "2026-01-11T..."
  }
]
```

---

### 4. Delete Watch History Entry

```bash
curl -X DELETE http://localhost:5055/api/v1/tracking/watch/1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response: 204 No Content**

**Test authorization (should fail with 403):**
Try deleting another user's watch entry.

---

### 5. Create or Update Review

**Create a new review:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE",
    "rating": 8,
    "content": "Great movie! Really enjoyed the cinematography and acting.",
    "containsSpoilers": false,
    "isPublic": true
  }'
```

**Expected Response (201 Created):**

```json
{
  "id": 1,
  "userId": 1,
  "mediaId": 1,
  "mediaType": "MOVIE",
  "rating": 8,
  "content": "Great movie! Really enjoyed the cinematography and acting.",
  "containsSpoilers": false,
  "isPublic": true,
  "createdAt": "2026-01-11T...",
  "updatedAt": "2026-01-11T..."
}
```

**Update existing review (same mediaId):**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE",
    "rating": 9,
    "content": "Actually, this is one of my favorite films!"
  }'
```

**Expected Response (200 OK):** Updated review with new rating/content.

**Review a TV season:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 2,
    "mediaType": "TV",
    "seasonNumber": 1,
    "rating": 7,
    "content": "Solid first season, looking forward to season 2."
  }'
```

---

### 6. Get Reviews

**Get all public reviews:**

```bash
curl http://localhost:5055/api/v1/tracking/reviews?take=20 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Filter by media:**

```bash
curl http://localhost:5055/api/v1/tracking/reviews?mediaId=1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Filter by user:**

```bash
curl http://localhost:5055/api/v1/tracking/reviews?userId=1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Only public reviews:**

```bash
curl http://localhost:5055/api/v1/tracking/reviews?isPublic=true \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response (200 OK):**

```json
{
  "pageInfo": {
    "pages": 1,
    "pageSize": 20,
    "results": 2,
    "page": 1
  },
  "results": [
    {
      "id": 2,
      "userId": 1,
      "mediaId": 2,
      "mediaType": "TV",
      "seasonNumber": 1,
      "rating": 7,
      "content": "Solid first season...",
      "containsSpoilers": false,
      "isPublic": true,
      "user": {
        "id": 1,
        "displayName": "Admin",
        "avatar": "/os_logo_square.png"
      },
      "media": {
        "id": 2,
        "tmdbId": 12345
      }
    }
  ]
}
```

---

### 7. Get Current User's Review for Media

```bash
curl http://localhost:5055/api/v1/tracking/reviews/1/me \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**For TV season:**

```bash
curl "http://localhost:5055/api/v1/tracking/reviews/2/me?seasonNumber=1" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response (200 OK):** Single review object

**If no review exists (404 Not Found):**

```json
{
  "status": 404,
  "message": "Review not found"
}
```

---

### 8. Delete Review

```bash
curl -X DELETE http://localhost:5055/api/v1/tracking/reviews/1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response: 204 No Content**

---

### 9. Get User Statistics

```bash
curl http://localhost:5055/api/v1/tracking/stats/1 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response (200 OK):**

```json
{
  "userId": 1,
  "watchStats": {
    "totalWatches": 5,
    "movieWatches": 3,
    "tvWatches": 2,
    "episodeWatches": 2
  },
  "reviewStats": {
    "totalReviews": 3,
    "publicReviews": 2,
    "privateReviews": 1,
    "averageRating": 8.3,
    "ratingDistribution": [
      { "rating": 7, "count": 1 },
      { "rating": 8, "count": 1 },
      { "rating": 10, "count": 1 }
    ]
  }
}
```

---

## Testing with Swagger UI

1. Navigate to: `http://localhost:5055/api-docs`
2. Find the **tracking** section
3. Click "Authorize" and login with your session cookie
4. Test each endpoint interactively

**Advantages:**

- Visual interface
- Automatic request/response validation
- Schema documentation
- Try out different parameters

---

## Validation Tests

### Test Invalid Requests

**Missing required fields:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/watch \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{}'
```

**Expected: 400 Bad Request with validation errors**

**Invalid rating (must be 1-10):**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE",
    "rating": 15
  }'
```

**Expected: 400 Bad Request**

```json
{
  "status": 400,
  "message": "Invalid request body.",
  "errors": [
    {
      "path": ["rating"],
      "message": "Number must be less than or equal to 10"
    }
  ]
}
```

**Review without rating or content:**

```bash
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE"
  }'
```

**Expected: 400 Bad Request** (must provide at least rating OR content)

---

## Authorization Tests

### Test User Ownership

1. **Login as User A**
2. Create a watch entry or review
3. **Logout and login as User B**
4. Try to delete User A's entry

**Expected: 403 Forbidden**

---

## Database Verification

**Check tables were created:**

```bash
# SQLite
sqlite3 config/db/db.sqlite3
.tables
# Should see: watch_history, media_review

# Check schema
.schema watch_history
.schema media_review

# View data
SELECT * FROM watch_history;
SELECT * FROM media_review;
```

**Check indexes:**

```sql
.indexes watch_history
.indexes media_review
```

---

## Common Issues

### 1. "Media not found" Error

- Ensure the `mediaId` exists in the `media` table
- First add media via Seerr UI or find existing media IDs

### 2. 401 Unauthorized

- Verify `connect.sid` cookie is valid
- Try logging in again

### 3. 500 Internal Server Error

- Check server logs for detailed error
- Verify migrations ran successfully
- Check foreign key constraints

### 4. Empty Results

- Create test data first by marking media as watched or creating reviews
- Check you're querying with the correct user session

---

## Quick Test Script

Save this as `test-tracking-api.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:5055/api/v1"
COOKIE="connect.sid=YOUR_SESSION_COOKIE"

echo "=== Testing Watch History ==="

# Mark movie as watched
echo "1. Marking movie as watched..."
curl -s -X POST "$BASE_URL/tracking/watch" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"mediaId": 1, "mediaType": "MOVIE"}' | jq

# Get watch history
echo "2. Getting watch history..."
curl -s "$BASE_URL/tracking/watch?take=10" \
  -H "Cookie: $COOKIE" | jq

echo ""
echo "=== Testing Reviews ==="

# Create review
echo "3. Creating review..."
curl -s -X POST "$BASE_URL/tracking/reviews" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "mediaId": 1,
    "mediaType": "MOVIE",
    "rating": 8,
    "content": "Great movie!"
  }' | jq

# Get reviews
echo "4. Getting reviews..."
curl -s "$BASE_URL/tracking/reviews?mediaId=1" \
  -H "Cookie: $COOKIE" | jq

echo ""
echo "=== Testing Stats ==="

# Get user stats
echo "5. Getting user stats..."
curl -s "$BASE_URL/tracking/stats/1" \
  -H "Cookie: $COOKIE" | jq
```

**Usage:**

```bash
chmod +x test-tracking-api.sh
./test-tracking-api.sh
```

---

## Next Steps After Testing

Once API tests pass:

1. ✅ Backend is validated and working
2. 📋 Document any bugs or issues found
3. 🎨 Start Phase 2: Frontend implementation
   - Create React components for watch tracking
   - Build review forms and displays
   - Add user statistics dashboard

---

_Testing guide created: 2026-01-11_
