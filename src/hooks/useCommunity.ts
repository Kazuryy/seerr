import useSWR from 'swr';
import type { Review } from './useReviews';

// ===== Community Feed =====

export interface CommunityFeedReview extends Review {
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
}

export interface CommunityFeedResponse {
  reviews: CommunityFeedReview[];
}

interface UseCommunityFeedOptions {
  mediaType?: 'all' | 'movie' | 'tv';
  sort?: 'latest' | 'top';
  limit?: number;
  offset?: number;
}

export const useCommunityFeed = (options: UseCommunityFeedOptions = {}) => {
  const params = new URLSearchParams();

  if (options.mediaType && options.mediaType !== 'all') {
    params.append('mediaType', options.mediaType);
  }
  if (options.sort) {
    params.append('sort', options.sort);
  }
  if (options.limit !== undefined) {
    params.append('limit', options.limit.toString());
  }
  if (options.offset !== undefined) {
    params.append('offset', options.offset.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/tracking/reviews/feed${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<CommunityFeedResponse>(endpoint, {
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

// ===== Leaderboard =====

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    displayName: string;
    avatar: string;
  };
  value: number;
}

export interface LeaderboardResponse {
  period: string;
  metric: string;
  leaderboard: LeaderboardEntry[];
}

interface UseLeaderboardOptions {
  period?: 'week' | 'month' | 'year' | 'alltime';
  metric?: 'reviews' | 'likes' | 'watches';
  limit?: number;
}

export const useLeaderboard = (options: UseLeaderboardOptions = {}) => {
  const params = new URLSearchParams();

  if (options.period) {
    params.append('period', options.period);
  }
  if (options.metric) {
    params.append('metric', options.metric);
  }
  if (options.limit !== undefined) {
    params.append('limit', options.limit.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/community/leaderboard${
    queryString ? `?${queryString}` : ''
  }`;

  const { data, error, mutate } = useSWR<LeaderboardResponse>(endpoint, {
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

// ===== Community Stats =====

export interface CommunityStatsResponse {
  totalUsers: number;
  activeUsersThisMonth: number;
  totalWatches: number;
  totalReviews: number;
  averageCommunityRating?: number;
  mostWatchedThisWeek: {
    id: number;
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    watchCount: number;
  }[];
  topRatedThisMonth: {
    id: number;
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    averageRating: number;
    reviewCount: number;
  }[];
}

export const useCommunityStats = () => {
  const endpoint = '/api/v1/community/stats';

  const { data, error, mutate } = useSWR<CommunityStatsResponse>(endpoint, {
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

// ===== Review Interactions =====

export interface ReviewLikeResponse {
  liked: boolean;
  likesCount: number;
}

export const toggleReviewLike = async (
  reviewId: number,
  currentlyLiked: boolean
): Promise<ReviewLikeResponse> => {
  const method = currentlyLiked ? 'DELETE' : 'POST';
  const response = await fetch(`/api/v1/tracking/reviews/${reviewId}/like`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to toggle like');
  }

  return response.json();
};

// ===== Review Comments =====

export interface ReviewComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    displayName: string;
    avatar: string;
  };
  replies?: ReviewComment[];
}

export interface ReviewCommentsResponse {
  comments: ReviewComment[];
}

export const useReviewComments = (reviewId: number) => {
  const endpoint = `/api/v1/tracking/reviews/${reviewId}/comments`;

  const { data, error, mutate } = useSWR<ReviewCommentsResponse>(endpoint, {
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

export const createReviewComment = async (
  reviewId: number,
  content: string,
  parentCommentId?: number
): Promise<ReviewComment> => {
  const response = await fetch(
    `/api/v1/tracking/reviews/${reviewId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, parentCommentId }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create comment');
  }

  return response.json();
};

export const deleteReviewComment = async (
  reviewId: number,
  commentId: number
): Promise<void> => {
  const response = await fetch(
    `/api/v1/tracking/reviews/${reviewId}/comments/${commentId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete comment');
  }
};
