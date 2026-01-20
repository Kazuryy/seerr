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

// ===== Activity Chart =====

export interface ActivityChartData {
  date: string;
  movies: number;
  episodes: number;
  total: number;
}

export interface ActivityChartResponse {
  userId: number;
  view: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  data: ActivityChartData[];
}

interface UseActivityChartResult {
  data?: ActivityChartResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch activity chart data (watches per day/week for last 3 months)
 * @param userId - The user ID to fetch data for
 * @param view - 'daily' or 'weekly' view
 */
export const useActivityChart = (
  userId?: number,
  view: 'daily' | 'weekly' = 'daily'
): UseActivityChartResult => {
  const endpoint = userId
    ? `/api/v1/tracking/stats/${userId}/activity-chart?view=${view}`
    : null;

  const { data, error, mutate } = useSWR<ActivityChartResponse>(endpoint, {
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

// ===== Watch Time =====

export interface WatchTimeResponse {
  userId: number;
  totalMinutes: number;
  breakdown: {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  totals: {
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    months: number;
    years: number;
  };
  watchCounts: {
    movies: number;
    episodes: number;
  };
  averageRuntimes: {
    movie: number;
    episode: number;
  };
}

interface UseWatchTimeResult {
  data?: WatchTimeResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch total watch time estimate
 * @param userId - The user ID to fetch data for
 */
export const useWatchTime = (userId?: number): UseWatchTimeResult => {
  const endpoint = userId
    ? `/api/v1/tracking/stats/${userId}/watch-time`
    : null;

  const { data, error, mutate } = useSWR<WatchTimeResponse>(endpoint, {
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

// ===== Watch Streak =====

export interface WatchStreakResponse {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastWatchDate: string | null;
  streakActive: boolean;
}

interface UseWatchStreakResult {
  data?: WatchStreakResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch watch streak data
 * @param userId - The user ID to fetch data for
 */
export const useWatchStreak = (userId?: number): UseWatchStreakResult => {
  const endpoint = userId
    ? `/api/v1/tracking/stats/${userId}/streak`
    : null;

  const { data, error, mutate } = useSWR<WatchStreakResponse>(endpoint, {
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
