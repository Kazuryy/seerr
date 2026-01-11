# Tracking Hooks Documentation

## Overview

This document describes the SWR hooks created for the Media Tracking & Reviews feature. These hooks provide a clean, type-safe API for React components to interact with the tracking backend.

## Installation

All hooks are exported from a central location:

```typescript
import {
  useWatchHistory,
  useMediaWatchHistory,
  useReviews,
  useMyReview,
  useUserStats,
  useMarkAsWatched,
  useCreateReview,
} from '@app/hooks/useTracking';
```

---

## Data Fetching Hooks

### `useWatchHistory(options?)`

Fetches paginated watch history for the current user with optional filters.

**Parameters:**

```typescript
interface UseWatchHistoryOptions {
  mediaId?: number; // Filter by specific media
  mediaType?: MediaType; // Filter by 'movie' or 'tv'
  take?: number; // Number of results (max 100)
  skip?: number; // Pagination offset
}
```

**Returns:**

```typescript
{
  data?: WatchHistoryResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;  // Manually revalidate
}
```

**Example:**

```typescript
const { data, isLoading, error } = useWatchHistory({
  mediaType: 'movie',
  take: 20,
});

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;

return (
  <div>
    {data?.results.map((watch) => (
      <WatchItem key={watch.id} watch={watch} />
    ))}
  </div>
);
```

---

### `useMediaWatchHistory(mediaId?)`

Fetches all watch history entries for a specific media item.

**Parameters:**

- `mediaId: number` - The media ID to fetch history for

**Returns:**

```typescript
{
  data?: WatchHistoryResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}
```

**Example:**

```typescript
const { data, isLoading } = useMediaWatchHistory(mediaId);

const watchCount = data?.results.length ?? 0;
const lastWatched = data?.results[0]?.watchedAt;
```

---

### `useReviews(options?)`

Fetches paginated reviews with optional filters.

**Parameters:**

```typescript
interface UseReviewsOptions {
  mediaId?: number; // Filter by specific media
  userId?: number; // Filter by specific user
  mediaType?: MediaType; // Filter by 'movie' or 'tv'
  isPublic?: boolean; // Filter by public/private
  take?: number; // Number of results (max 100)
  skip?: number; // Pagination offset
}
```

**Returns:**

```typescript
{
  data?: ReviewsResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}
```

**Example:**

```typescript
// Get public reviews for a movie
const { data } = useReviews({
  mediaId: 123,
  isPublic: true,
  take: 10,
});

// Get all reviews by a specific user
const { data: userReviews } = useReviews({
  userId: 456,
});
```

---

### `useMyReview(mediaId?, seasonNumber?)`

Fetches the current user's review for a specific media item.

**Parameters:**

- `mediaId?: number` - The media ID
- `seasonNumber?: number` - Optional season number for TV shows

**Returns:**

```typescript
{
  data?: Review;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}
```

**Example:**

```typescript
const { data: myReview, mutate } = useMyReview(mediaId);

const hasReviewed = !!myReview;
const myRating = myReview?.rating;

// After creating/updating a review
await createReview({ ... });
mutate(); // Refresh the review data
```

---

### `useUserStats(userId?)`

Fetches statistics for a user's watch history and reviews.

**Parameters:**

- `userId?: number` - The user ID to fetch stats for

**Returns:**

```typescript
{
  data?: UserStats;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}
```

**Example:**

```typescript
const { data: stats } = useUserStats(userId);

return (
  <div>
    <h2>Stats</h2>
    <p>Total watches: {stats?.watchStats.totalWatches}</p>
    <p>Movies: {stats?.watchStats.movieWatches}</p>
    <p>TV Episodes: {stats?.watchStats.episodeWatches}</p>
    <p>Average rating: {stats?.reviewStats.averageRating.toFixed(1)}</p>
  </div>
);
```

---

## Mutation Hooks

### `useMarkAsWatched()`

Hook for marking media as watched and deleting watch entries.

**Returns:**

```typescript
{
  markAsWatched: (params: MarkAsWatchedParams) => Promise<WatchHistoryItem>;
  deleteWatchEntry: (watchId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

**Example:**

```typescript
const { markAsWatched, isLoading, error } = useMarkAsWatched();
const { mutate: refreshHistory } = useWatchHistory();

const handleMarkWatched = async () => {
  try {
    await markAsWatched({
      mediaId: 123,
      mediaType: 'movie',
    });

    // Refresh the watch history
    refreshHistory();

    toast.success('Marked as watched!');
  } catch (err) {
    toast.error('Failed to mark as watched');
  }
};

// For TV episodes
await markAsWatched({
  mediaId: 456,
  mediaType: 'tv',
  seasonNumber: 1,
  episodeNumber: 5,
});
```

---

### `useCreateReview()`

Hook for creating, updating, and deleting reviews.

**Returns:**

```typescript
{
  createOrUpdateReview: (params: CreateReviewParams) => Promise<Review>;
  deleteReview: (reviewId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

**Example:**

```typescript
const { createOrUpdateReview, deleteReview, isLoading } = useCreateReview();
const { mutate: refreshMyReview } = useMyReview(mediaId);

const handleSubmitReview = async (formData) => {
  try {
    await createOrUpdateReview({
      mediaId,
      mediaType: 'movie',
      rating: formData.rating,
      content: formData.content,
      containsSpoilers: formData.hasSpoilers,
      isPublic: formData.isPublic,
    });

    refreshMyReview();
    toast.success('Review saved!');
  } catch (err) {
    toast.error('Failed to save review');
  }
};

const handleDeleteReview = async (reviewId) => {
  await deleteReview(reviewId);
  refreshMyReview();
};
```

---

## Type Definitions

### `WatchHistoryItem`

```typescript
interface WatchHistoryItem {
  id: number;
  userId: number;
  mediaId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  watchedAt: string;
  createdAt: string;
  updatedAt: string;
  media?: {
    id: number;
    tmdbId: number;
    mediaType: string;
  };
}
```

### `Review`

```typescript
interface Review {
  id: number;
  userId: number;
  mediaId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  rating?: number;
  content?: string;
  containsSpoilers: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    displayName: string;
    avatar: string;
  };
  media?: {
    id: number;
    tmdbId: number;
  };
}
```

### `UserStats`

```typescript
interface UserStats {
  userId: number;
  watchStats: {
    totalWatches: number;
    movieWatches: number;
    tvWatches: number;
    episodeWatches: number;
  };
  reviewStats: {
    totalReviews: number;
    publicReviews: number;
    privateReviews: number;
    averageRating: number;
    ratingDistribution: Array<{
      rating: number;
      count: number;
    }>;
  };
}
```

### `MediaType`

```typescript
type MediaType = 'movie' | 'tv';
```

---

## Best Practices

### 1. Optimistic Updates

For better UX, use optimistic updates with SWR's `mutate`:

```typescript
const { mutate } = useWatchHistory();
const { markAsWatched } = useMarkAsWatched();

const handleQuickWatch = async (mediaId: number) => {
  // Optimistically update the UI
  mutate(
    (currentData) => {
      if (!currentData) return currentData;

      const newWatch: WatchHistoryItem = {
        id: Date.now(), // Temporary ID
        userId: currentUser.id,
        mediaId,
        mediaType: 'movie',
        watchedAt: new Date().toISOString(),
        // ... other fields
      };

      return {
        ...currentData,
        results: [newWatch, ...currentData.results],
      };
    },
    false // Don't revalidate yet
  );

  // Perform the actual API call
  try {
    await markAsWatched({ mediaId, mediaType: 'movie' });
    mutate(); // Revalidate with real data
  } catch (err) {
    mutate(); // Revert on error
    throw err;
  }
};
```

### 2. Conditional Fetching

Hooks accept `undefined` to disable fetching:

```typescript
// Only fetch if user is logged in and mediaId exists
const { data } = useMyReview(user?.id && mediaId ? mediaId : undefined);
```

### 3. Error Handling

All hooks return errors for graceful handling:

```typescript
const { data, error, isLoading } = useWatchHistory();

if (isLoading) return <LoadingSpinner />;
if (error) {
  return (
    <Alert variant="error">
      Failed to load watch history. Please try again.
    </Alert>
  );
}

return <WatchHistoryList data={data} />;
```

### 4. Manual Revalidation

Use `mutate()` to refresh data after mutations:

```typescript
const { mutate: refreshHistory } = useWatchHistory();
const { mutate: refreshReviews } = useReviews({ mediaId });
const { markAsWatched } = useMarkAsWatched();

const handleAction = async () => {
  await markAsWatched({ ... });

  // Refresh all related data
  refreshHistory();
  refreshReviews();
};
```

### 5. Pagination

Handle pagination with `take` and `skip`:

```typescript
const [page, setPage] = useState(1);
const pageSize = 20;

const { data } = useWatchHistory({
  take: pageSize,
  skip: (page - 1) * pageSize,
});

const totalPages = data?.pageInfo.pages ?? 1;
```

---

## Integration Examples

### Movie Detail Page - Quick Watch Button

```typescript
import { useMarkAsWatched } from '@app/hooks/useTracking';

const MovieDetailPage = ({ movieId }) => {
  const { markAsWatched, isLoading } = useMarkAsWatched();

  const handleMarkWatched = async () => {
    await markAsWatched({
      mediaId: movieId,
      mediaType: 'movie',
    });
  };

  return (
    <Button onClick={handleMarkWatched} disabled={isLoading}>
      {isLoading ? 'Saving...' : 'Mark as Watched'}
    </Button>
  );
};
```

### User Profile - Statistics Dashboard

```typescript
import { useUserStats } from '@app/hooks/useTracking';

const UserStatsCard = ({ userId }) => {
  const { data: stats, isLoading } = useUserStats(userId);

  if (isLoading) return <Skeleton />;

  return (
    <Card>
      <h3>Watch Statistics</h3>
      <Stat label="Total Watches" value={stats.watchStats.totalWatches} />
      <Stat label="Movies" value={stats.watchStats.movieWatches} />
      <Stat label="TV Episodes" value={stats.watchStats.episodeWatches} />

      <h3>Review Statistics</h3>
      <Stat
        label="Average Rating"
        value={stats.reviewStats.averageRating.toFixed(1)}
      />
      <Stat label="Total Reviews" value={stats.reviewStats.totalReviews} />
    </Card>
  );
};
```

### Community Reviews Page

```typescript
import { useReviews } from '@app/hooks/useTracking';

const CommunityReviewsPage = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReviews({
    isPublic: true,
    take: 20,
    skip: (page - 1) * 20,
  });

  return (
    <div>
      <h1>Community Reviews</h1>
      {data?.results.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      <Pagination
        currentPage={page}
        totalPages={data?.pageInfo.pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
};
```

---

## Testing

All hooks can be tested using `@testing-library/react-hooks`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useWatchHistory } from '@app/hooks/useTracking';

test('useWatchHistory fetches data', async () => {
  const { result } = renderHook(() => useWatchHistory());

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Next Steps

1. ✅ Hooks created and type-checked
2. 🔄 Create basic UI components using these hooks
3. 🔄 Integrate into existing Seerr pages
4. 🔄 Build dedicated tracking pages (activity, community)
5. 🔄 Add E2E tests for user flows

---

_Documentation created: 2026-01-11_
