import type { SeriesProgressStatus } from '@server/entity/SeriesProgress';
import useSWR from 'swr';

export interface SeriesProgress {
  mediaId: number;
  tmdbId: number;
  title?: string;
  posterPath?: string;
  backdropPath?: string;
  watchedEpisodes: number;
  totalEpisodes: number;
  totalSeasons: number;
  completionPercentage: number;
  status: SeriesProgressStatus;
  isOngoing: boolean;
  isCompleted: boolean;
  completionCount: number;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

export interface SeriesProgressListResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: SeriesProgress[];
}

export interface SeriesCompletionStats {
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
  totalInProgress: number;
  averageCompletion: number;
  totalEpisodesWatched: number;
}

/**
 * Hook to get series progress for a specific media
 */
export const useSeriesProgress = (mediaId?: number) => {
  const { data, error, mutate } = useSWR<SeriesProgress>(
    mediaId ? `/api/v1/tracking/series/${mediaId}/progress` : null
  );

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

/**
 * Hook to get all series progress for the current user
 */
export const useSeriesProgressList = (options?: {
  status?: 'all' | 'in_progress' | 'completed' | 'abandoned';
  sortBy?: 'lastWatched' | 'percentage' | 'name';
  take?: number;
  skip?: number;
}) => {
  const params = new URLSearchParams();

  if (options?.status) params.set('status', options.status);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.take) params.set('take', options.take.toString());
  if (options?.skip) params.set('skip', options.skip.toString());

  const queryString = params.toString();
  const url = `/api/v1/tracking/series/progress${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<SeriesProgressListResponse>(url);

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

/**
 * Hook to get series completion stats for a user
 */
export const useSeriesCompletionStats = (userId?: number) => {
  const { data, error, mutate } = useSWR<SeriesCompletionStats>(
    userId ? `/api/v1/tracking/stats/${userId}/series-completion` : null
  );

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};

export default useSeriesProgress;
