import useSWR from 'swr';

export interface UserStats {
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
    ratingDistribution: {
      rating: number;
      count: number;
    }[];
  };
}

interface UseUserStatsResult {
  data?: UserStats;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch user statistics for watch history and reviews
 * @param userId - The user ID to fetch stats for
 */
export const useUserStats = (userId?: number): UseUserStatsResult => {
  const endpoint = userId ? `/api/v1/tracking/stats/${userId}` : null;

  const { data, error, mutate } = useSWR<UserStats>(endpoint, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};
