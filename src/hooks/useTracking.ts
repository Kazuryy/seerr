/**
 * Central export for all tracking-related hooks
 * This provides a clean API for components to import tracking functionality
 */

export { useBatchMarkAsWatched } from './useBatchMarkAsWatched';
export { useCreateReview } from './useCreateReview';
export { useMarkAsWatched } from './useMarkAsWatched';
export { useMyReview, useReviews } from './useReviews';
export type { Review, ReviewsResponse } from './useReviews';
export { useTopRated } from './useTopRated';
export type { TopRatedItem } from './useTopRated';
export { useUserStats } from './useUserStats';
export type { UserStats } from './useUserStats';
export { useMediaWatchHistory, useWatchHistory } from './useWatchHistory';
export type {
  MediaType,
  WatchHistoryItem,
  WatchHistoryResponse,
} from './useWatchHistory';
