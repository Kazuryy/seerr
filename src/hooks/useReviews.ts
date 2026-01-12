import useSWR from 'swr';
import type { MediaType } from './useWatchHistory';

export interface Review {
  id: number;
  userId: number;
  mediaId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  rating?: number;
  content?: string;
  containsSpoilers: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    displayName: string;
    avatar: string;
  };
  media?: {
    id: number;
    tmdbId: number;
    mediaType?: string;
    title?: string;
    posterPath?: string;
  };
}

export interface ReviewsResponse {
  pageInfo: {
    pages: number;
    pageSize: number;
    results: number;
    page: number;
  };
  results: Review[];
}

interface UseReviewsOptions {
  mediaId?: number;
  userId?: number;
  mediaType?: MediaType;
  isPublic?: boolean;
  take?: number;
  skip?: number;
}

interface UseReviewsResult {
  data?: ReviewsResponse;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch reviews with optional filters
 * @param options - Filter and pagination options
 */
export const useReviews = (
  options: UseReviewsOptions = {}
): UseReviewsResult => {
  const params = new URLSearchParams();

  if (options.mediaId !== undefined) {
    params.append('mediaId', options.mediaId.toString());
  }
  if (options.userId !== undefined) {
    params.append('userId', options.userId.toString());
  }
  if (options.mediaType) {
    params.append('mediaType', options.mediaType);
  }
  if (options.isPublic !== undefined) {
    params.append('isPublic', options.isPublic.toString());
  }
  if (options.take !== undefined) {
    params.append('take', options.take.toString());
  }
  if (options.skip !== undefined) {
    params.append('skip', options.skip.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/tracking/reviews${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<ReviewsResponse>(endpoint, {
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
 * Hook to fetch the current user's review for a specific media item
 * @param mediaId - The media ID
 * @param seasonNumber - Optional season number for TV shows
 */
export const useMyReview = (
  mediaId?: number,
  seasonNumber?: number
): {
  data?: Review;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
} => {
  const params = new URLSearchParams();
  if (seasonNumber !== undefined) {
    params.append('seasonNumber', seasonNumber.toString());
  }

  const queryString = params.toString();
  const endpoint = mediaId
    ? `/api/v1/tracking/reviews/${mediaId}/me${
        queryString ? `?${queryString}` : ''
      }`
    : null;

  const { data, error, mutate } = useSWR<Review>(endpoint, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false, // Don't retry on 404 (no review exists)
  });

  return {
    data,
    error,
    isLoading: !data && !error,
    mutate,
  };
};
