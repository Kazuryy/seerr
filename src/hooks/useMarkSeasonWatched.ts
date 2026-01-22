import axios from 'axios';
import { useCallback, useState } from 'react';
import useSWR from 'swr';

export interface SeasonWatchStatus {
  watchedEpisodes: number;
  manualEpisodes: number;
  totalEpisodes: number;
  isComplete: boolean;
  hasManualEntries: boolean;
}

export interface MarkSeasonResult {
  success: boolean;
  message: string;
  markedEpisodes: number;
  skippedEpisodes: number;
  totalEpisodes: number;
}

/**
 * Hook to mark/unmark a season as watched
 */
export const useMarkSeasonWatched = (tmdbId: number, seasonNumber: number) => {
  const [isMarking, setIsMarking] = useState(false);
  const [isUnmarking, setIsUnmarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current season status
  const {
    data: status,
    error: statusError,
    mutate: mutateStatus,
  } = useSWR<SeasonWatchStatus>(
    tmdbId && seasonNumber !== undefined
      ? `/api/v1/tracking/series/${tmdbId}/season/${seasonNumber}/status`
      : null
  );

  const markAsWatched = useCallback(
    async (watchedAt?: Date): Promise<MarkSeasonResult | null> => {
      setIsMarking(true);
      setError(null);

      try {
        const response = await axios.post<MarkSeasonResult>(
          `/api/v1/tracking/series/${tmdbId}/mark-season`,
          {
            seasonNumber,
            watchedAt: watchedAt?.toISOString(),
          }
        );

        // Refresh status
        mutateStatus();

        return response.data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Failed to mark season as watched';
        setError(errorMessage);
        return null;
      } finally {
        setIsMarking(false);
      }
    },
    [tmdbId, seasonNumber, mutateStatus]
  );

  const unmarkSeason = useCallback(async (): Promise<boolean> => {
    setIsUnmarking(true);
    setError(null);

    try {
      await axios.delete(
        `/api/v1/tracking/series/${tmdbId}/mark-season/${seasonNumber}`
      );

      // Refresh status
      mutateStatus();

      return true;
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to unmark season';
      setError(errorMessage);
      return false;
    } finally {
      setIsUnmarking(false);
    }
  }, [tmdbId, seasonNumber, mutateStatus]);

  return {
    status,
    isLoading: !status && !statusError,
    isMarking,
    isUnmarking,
    error,
    markAsWatched,
    unmarkSeason,
    mutateStatus,
  };
};

export default useMarkSeasonWatched;
