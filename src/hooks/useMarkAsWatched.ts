import axios from 'axios';
import { useCallback, useState } from 'react';
import type { MediaType, WatchHistoryItem } from './useWatchHistory';

interface MarkAsWatchedParams {
  mediaId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  watchedAt?: string;
}

interface UseMarkAsWatchedResult {
  markAsWatched: (params: MarkAsWatchedParams) => Promise<WatchHistoryItem>;
  deleteWatchEntry: (watchId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to mark media as watched and delete watch entries
 */
export const useMarkAsWatched = (): UseMarkAsWatchedResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAsWatched = useCallback(
    async (params: MarkAsWatchedParams): Promise<WatchHistoryItem> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.post<WatchHistoryItem>(
          '/api/v1/tracking/watch',
          params
        );
        return response.data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Failed to mark as watched';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteWatchEntry = useCallback(
    async (watchId: number): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await axios.delete(`/api/v1/tracking/watch/${watchId}`);
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Failed to delete watch entry';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    markAsWatched,
    deleteWatchEntry,
    isLoading,
    error,
  };
};
