# API Routes Implementation Summary

## Overview

Successfully implemented RESTful API routes for the Media Tracking & Reviews feature. All routes are authenticated and follow existing project patterns.

---

## ✅ Implemented Routes

### Watch History Routes

Base path: `/api/v1/tracking/watch`

#### 1. POST `/api/v1/tracking/watch`

**Mark media as watched**

**Request Body:**

```typescript
{
  mediaId: number;
  mediaType: 'MOVIE' | 'TV';
  seasonNumber?: number;      // Optional for TV shows
  episodeNumber?: number;     // Optional for episodes
  watchedAt?: string;         // ISO 8601 datetime, defaults to now
}
```

**Response:** `201 Created`

```typescript
{
  id: number;
  userId: number;
  mediaId: number;
  mediaType: 'MOVIE' | 'TV';
  seasonNumber?: number;
  episodeNumber?: number;
  watchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Features:**

- Verifies media exists before creating entry
- Supports rewatches (no unique constraint)
- Logs activity for audit trail

---

#### 2. GET `/api/v1/tracking/watch`

**Get user's watch history**

**Query Parameters:**

```typescript
{
  take?: number;        // Default: 20, Max: 100
  skip?: number;        // Default: 0
  mediaType?: 'MOVIE' | 'TV';
}
```

**Response:** `200 OK`

```typescript
{
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: WatchHistory[];
}
```

**Features:**

- Pagination support
- Filter by media type
- Ordered by watchedAt DESC
- Includes media relation (eager loaded)

---

#### 3. GET `/api/v1/tracking/watch/:mediaId`

**Get watch history for specific media**

**Response:** `200 OK`

```typescript
WatchHistory[]  // Ordered by watchedAt DESC
```

**Features:**

- Returns all watch entries for a media (supports rewatches)
- User can only see their own history

---

#### 4. DELETE `/api/v1/tracking/watch/:watchId`

**Delete a watch history entry**

**Response:** `204 No Content`

**Authorization:**

- Users can only delete their own entries
- Returns `403 Forbidden` if not owner

---

### Review Routes

Base path: `/api/v1/tracking/reviews`

#### 1. POST `/api/v1/tracking/reviews`

**Create or update a review**

**Request Body:**

```typescript
{
  mediaId: number;
  mediaType: 'MOVIE' | 'TV';
  seasonNumber?: number;           // Optional for TV seasons
  rating?: number;                 // 1-10, optional
  content?: string;                // Max 5000 chars, optional
  containsSpoilers?: boolean;      // Default: false
  isPublic?: boolean;              // Default: true
  watchedAt?: string;              // ISO 8601 datetime
}
```

**Validation:**

- At least `rating` OR `content` must be provided
- Rating must be between 1-10

**Response:**

- `201 Created` (new review)
- `200 OK` (updated review)

**Features:**

- Upsert logic (updates if review exists)
- Unique constraint: one review per user per media/season
- Verifies media exists

---

#### 2. GET `/api/v1/tracking/reviews`

**Get reviews with filters**

**Query Parameters:**

```typescript
{
  take?: number;        // Default: 20, Max: 100
  skip?: number;        // Default: 0
  mediaId?: number;     // Filter by media
  userId?: number;      // Filter by user
  isPublic?: boolean;   // Filter by visibility
}
```

**Response:** `200 OK`

```typescript
{
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: MediaReview[];
}
```

**Privacy Logic:**

- If `userId` specified: returns all reviews for that user
- If `isPublic=true`: returns only public reviews
- If no filters: returns public reviews + current user's private reviews

**Features:**

- Includes user and media relations
- Ordered by createdAt DESC
- Respects privacy settings

---

#### 3. GET `/api/v1/tracking/reviews/:mediaId/me`

**Get current user's review for specific media**

**Query Parameters:**

```typescript
{
  seasonNumber?: number;  // Optional for TV seasons
}
```

**Response:**

- `200 OK` with review object
- `404 Not Found` if no review exists

---

#### 4. DELETE `/api/v1/tracking/reviews/:reviewId`

**Delete a review**

**Response:** `204 No Content`

**Authorization:**

- Users can only delete their own reviews
- Returns `403 Forbidden` if not owner

---

### Stats Route

#### GET `/api/v1/tracking/stats/:userId`

**Get user statistics**

**Response:** `200 OK`

```typescript
{
  userId: number;
  watchStats: {
    totalWatches: number;
    movieWatches: number;
    tvWatches: number;
    episodeWatches: number;
  }
  reviewStats: {
    totalReviews: number;
    publicReviews: number;
    privateReviews: number;
    averageRating: number | null; // 1 decimal place
    ratingDistribution: Array<{
      rating: number;
      count: number;
    }>;
  }
}
```

**Features:**

- Aggregated statistics for a user
- Rating distribution (1-10 breakdown)
- Episode-specific watch count

---

## 🔒 Authentication & Authorization

All routes require authentication via `isAuthenticated()` middleware.

**Authorization Rules:**

1. Users can only create/update/delete their own entries
2. Users can view:
   - Their own private content
   - All public content from other users
3. Stats are public (any authenticated user can view)

---

## ✅ Validation

All routes use **Zod schemas** for input validation:

- Type safety for request bodies and query parameters
- Custom error messages for validation failures
- Protection against invalid data

**Example Validation Errors:**

```typescript
{
  status: 400,
  message: "Invalid request body.",
  errors: [
    {
      path: ["rating"],
      message: "Number must be greater than or equal to 1"
    }
  ]
}
```

---

## 🗄️ Database Queries

### Optimizations

1. **Indexes Used:**

   - `(userId, mediaId, watchedAt)` composite on WatchHistory
   - `(userId, mediaId, seasonNumber)` unique composite on MediaReview
   - `(mediaId, isPublic)` on MediaReview for public queries

2. **Eager Loading:**

   - Media relations loaded where needed
   - User relations loaded for review queries

3. **Query Builders:**
   - Used for complex filtering (stats, reviews)
   - Prevents N+1 queries

### TypeORM Patterns

```typescript
// IsNull() for nullable unique constraints
where: {
  seasonNumber: seasonNumber ?? IsNull();
}

// Proper MediaType enum usage
where: {
  mediaType: MediaType.MOVIE;
}
```

---

## 📝 Logging

All routes include comprehensive logging:

```typescript
logger.info('User marked media as watched', {
  label: 'Tracking Routes',
  userId: user.id,
  mediaId: media.id,
});

logger.error('Failed to create watch history entry', {
  label: 'Tracking Routes',
  error: error.message,
});
```

---

## 🧪 Testing Recommendations

### Manual Testing with cURL

```bash
# Mark movie as watched
curl -X POST http://localhost:5055/api/v1/tracking/watch \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"mediaId": 123, "mediaType": "MOVIE"}'

# Get watch history
curl http://localhost:5055/api/v1/tracking/watch?take=10 \
  -H "Cookie: connect.sid=..."

# Create review
curl -X POST http://localhost:5055/api/v1/tracking/reviews \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "mediaId": 123,
    "mediaType": "MOVIE",
    "rating": 8,
    "content": "Great movie!",
    "isPublic": true
  }'

# Get user stats
curl http://localhost:5055/api/v1/tracking/stats/1 \
  -H "Cookie: connect.sid=..."
```

---

## 🚀 Next Steps

Now that the API routes are complete, the next phase is:

### Phase 2: Frontend Implementation

1. **Components to Create:**

   - `<MarkAsWatchedButton>` - Quick action button
   - `<RatingInput>` - 1-10 star rating component
   - `<ReviewForm>` - Create/edit review modal
   - `<WatchHistoryList>` - Display user's watch history
   - `<ReviewsList>` - Display reviews with spoiler blur
   - `<UserStats>` - Stats dashboard component

2. **Pages to Create:**

   - `/activity` - User activity dashboard
   - `/community` - Community reviews feed
   - Integration on movie/TV detail pages

3. **State Management:**
   - SWR hooks for data fetching
   - Optimistic updates for better UX

---

## 📚 Files Modified

**Created:**

- `server/routes/tracking.ts` (663 lines)

**Modified:**

- `server/routes/index.ts` (added route registration)

**Build Status:** ✅ Passes TypeScript compilation and ESLint

---

_API Routes completed: 2026-01-11_
_Ready for: Frontend implementation_
