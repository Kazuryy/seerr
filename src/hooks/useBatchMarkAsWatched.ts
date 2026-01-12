import axios from 'axios';
import { useCallback } from 'react';
import { mutate } from 'swr';

interface BatchMarkAsWatchedParams {
  mediaId: number;
  seasonNumber: number;
  episodeNumbers: number[];
  watchedAt?: string;
}

interface BatchMarkAsWatchedResponse {
  message: string;
  count: number;
  entries: {
    id: number;
    userId: number;
    mediaId: number;
    mediaType: string;
    seasonNumber: number;
    episodeNumber: number;
    watchedAt: string;
  }[];
}

export const useBatchMarkAsWatched = () => {
  const batchMarkAsWatched = useCallback(
    async (params: BatchMarkAsWatchedParams) => {
      const response = await axios.post<BatchMarkAsWatchedResponse>(
        '/api/v1/tracking/watch/batch',
        {
          ...params,
          mediaType: 'tv', // Only TV shows support batch marking
        }
      );

      // Invalidate relevant caches
      mutate('/api/v1/tracking/watch');
      mutate(`/api/v1/tracking/watch/${params.mediaId}`);
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/v1/users')
      );

      return response.data;
    },
    []
  );

  return { batchMarkAsWatched };
};
