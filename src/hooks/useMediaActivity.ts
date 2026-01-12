import useSWR from 'swr';
import type { MediaType } from './useWatchHistory';

export interface MediaActivity {
  watchCount: number;
  lastWatchedAt?: string;
  userReview?: {
    id: number;
    rating?: number;
    content?: string;
    isPublic: boolean;
    containsSpoilers: boolean;
    createdAt: string;
    updatedAt: string;
  };
  communityStats?: {
    averageRating?: number;
    totalRatings: number;
    totalReviews: number;
  };
}

interface UseMediaActivityOptions {
  mediaId?: number;
  mediaType?: MediaType;
}

interface UseMediaActivityResult {
  data?: MediaActivity;
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch user's activity for a specific media item
 * @param options - Media ID and type
 */
export const useMediaActivity = (
  options: UseMediaActivityOptions
): UseMediaActivityResult => {
  const { mediaId, mediaType } = options;

  const endpoint =
    mediaId && mediaType
      ? `/api/v1/tracking/media/${mediaId}/activity?mediaType=${mediaType}`
      : null;

  const { data, error, mutate } = useSWR<MediaActivity>(endpoint, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    data,
    error,
    isLoading: !data && !error && !!endpoint,
    mutate,
  };
};
