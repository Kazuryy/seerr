import useSWR from 'swr';

export type MediaType = 'movie' | 'tv';

export interface WatchHistoryItem {
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
    title?: string;
    posterPath?: string;
    backdropPath?: string;
  };
}

export interface WatchHistoryResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: WatchHistoryItem[];
}

interface UseWatchHistoryOptions {
  mediaId?: number;
  mediaType?: MediaType;
  take?: number;
  skip?: number;
}

interface UseWatchHistoryResult {
  data?: WatchHistoryResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch watch history for the current user
 * @param options - Filter and pagination options
 */
export const useWatchHistory = (
  options: UseWatchHistoryOptions = {}
): UseWatchHistoryResult => {
  const params = new URLSearchParams();

  if (options.mediaType) {
    params.append('mediaType', options.mediaType);
  }
  if (options.take !== undefined) {
    params.append('take', options.take.toString());
  }
  if (options.skip !== undefined) {
    params.append('skip', options.skip.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/tracking/watch${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<WatchHistoryResponse>(endpoint, {
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

/**
 * Hook to fetch watch history for a specific media item
 * @param mediaId - The media ID to fetch watch history for
 */
export const useMediaWatchHistory = (
  mediaId?: number
): UseWatchHistoryResult => {
  const endpoint = mediaId ? `/api/v1/tracking/watch/${mediaId}` : null;

  const { data, error, mutate } = useSWR<WatchHistoryItem[]>(endpoint, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Transform single media response to match the standard format
  const transformedData = data
    ? {
        pageInfo: {
          pages: 1,
          pageSize: data.length,
          results: data.length,
          page: 1,
        },
        results: data,
      }
    : undefined;

  return {
    data: transformedData,
    error,
    isLoading: !data && !error,
    mutate,
  };
};
