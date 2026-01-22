import axios from 'axios';
import { useCallback } from 'react';
import useSWR from 'swr';

export interface SeasonWatchStatus {
  watchedEpisodes: number;
  manualEpisodes: number;
  totalEpisodes: number;
  watchedEpisodeNumbers: number[];
  manualEpisodeNumbers: number[];
  isComplete: boolean;
  hasManualEntries: boolean;
}

/**
 * Hook to manage episode watch status for a season
 */
export const useEpisodeWatchStatus = (tmdbId: number, seasonNumber: number) => {
  // Get season status which includes episode info
  const {
    data: seasonStatus,
    error,
    mutate,
  } = useSWR<SeasonWatchStatus>(
    tmdbId && seasonNumber !== undefined
      ? `/api/v1/tracking/series/${tmdbId}/season/${seasonNumber}/status`
      : null
  );

  const markEpisode = useCallback(
    async (episodeNumber: number): Promise<boolean> => {
      try {
        await axios.post(`/api/v1/tracking/series/${tmdbId}/mark-episode`, {
          seasonNumber,
          episodeNumber,
        });
        mutate();
        return true;
      } catch {
        return false;
      }
    },
    [tmdbId, seasonNumber, mutate]
  );

  const unmarkEpisode = useCallback(
    async (episodeNumber: number): Promise<boolean> => {
      try {
        await axios.delete(
          `/api/v1/tracking/series/${tmdbId}/mark-episode/${seasonNumber}/${episodeNumber}`
        );
        mutate();
        return true;
      } catch {
        return false;
      }
    },
    [tmdbId, seasonNumber, mutate]
  );

  const markMultipleEpisodes = useCallback(
    async (
      episodes: { seasonNumber: number; episodeNumber: number }[]
    ): Promise<boolean> => {
      try {
        await axios.post(`/api/v1/tracking/series/${tmdbId}/mark-episodes`, {
          episodes,
        });
        mutate();
        return true;
      } catch {
        return false;
      }
    },
    [tmdbId, mutate]
  );

  return {
    seasonStatus,
    isLoading: !seasonStatus && !error,
    error,
    markEpisode,
    unmarkEpisode,
    markMultipleEpisodes,
    mutate,
  };
};

export default useEpisodeWatchStatus;
