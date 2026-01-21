import axios from 'axios';
import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import type { Review } from './useReviews';
import type { MediaType } from './useWatchHistory';

interface CreateReviewParams {
  mediaId?: number; // Internal media ID (optional, use tmdbId instead)
  tmdbId?: number; // TMDB ID for creating media if not exists (preferred)
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  rating?: number;
  content?: string;
  containsSpoilers?: boolean;
  isPublic?: boolean;
}

interface UseCreateReviewResult {
  createOrUpdateReview: (params: CreateReviewParams) => Promise<Review>;
  deleteReview: (reviewId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to create, update, and delete reviews
 */
export const useCreateReview = (): UseCreateReviewResult => {
  const { mutate } = useSWRConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrUpdateReview = useCallback(
    async (params: CreateReviewParams): Promise<Review> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.post<Review>(
          '/api/v1/tracking/reviews',
          params
        );

        // Invalidate all review-related caches
        mutate(
          (key) =>
            typeof key === 'string' &&
            (key.includes('/reviews') ||
              key.includes('/activity') ||
              key.includes('/tracking')),
          undefined,
          { revalidate: true }
        );

        return response.data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Failed to save review';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutate]
  );

  const deleteReview = useCallback(async (reviewId: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/v1/tracking/reviews/${reviewId}`);
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to delete review';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createOrUpdateReview,
    deleteReview,
    isLoading,
    error,
  };
};
