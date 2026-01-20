/**
 * Central export for all tracking-related hooks
 * This provides a clean API for components to import tracking functionality
 */

export { useCreateReview } from './useCreateReview';
export { useMediaActivity } from './useMediaActivity';
export type { MediaActivity } from './useMediaActivity';
export { useMyReview, useReviews } from './useReviews';
export type { Review, ReviewsResponse } from './useReviews';
export { useTopRated } from './useTopRated';
export type { TopRatedItem } from './useTopRated';
export {
  useActivityChart,
  useUserStats,
  useWatchStreak,
  useWatchTime,
} from './useUserStats';
export type {
  ActivityChartData,
  ActivityChartResponse,
  UserStats,
  WatchStreakResponse,
  WatchTimeResponse,
} from './useUserStats';
export { useMediaWatchHistory, useWatchHistory } from './useWatchHistory';
export type {
  MediaType,
  WatchHistoryItem,
  WatchHistoryResponse,
} from './useWatchHistory';
