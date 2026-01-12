import useSWR from 'swr';
import type { Review } from './useReviews';

export interface TopRatedItem extends Review {
  watchCount: number;
}

interface UseTopRatedOptions {
  take?: number;
}

interface UseTopRatedResult {
  data?: TopRatedItem[];
  error: unknown;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Hook to fetch user's top-rated media items
 * @param options - Options for fetching top-rated items
 */
export const useTopRated = (
  options: UseTopRatedOptions = {}
): UseTopRatedResult => {
  const { take = 5 } = options;

  const params = new URLSearchParams();
  params.append('take', take.toString());

  const queryString = params.toString();
  const endpoint = `/api/v1/tracking/top-rated${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<TopRatedItem[]>(endpoint, {
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
