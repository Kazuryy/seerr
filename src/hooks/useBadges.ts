import useSWR from 'swr';
import axios from 'axios';

export interface BadgeDefinition {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  category: 'watching' | 'reviews' | 'social' | 'streaks' | 'special' | 'community';
}

export interface UserBadge extends BadgeDefinition {
  id: number;
  userId: number;
  earnedAt: string;
  metadata?: string;
}

export interface BadgeProgress {
  movies: number;
  episodes: number;
  reviews: number;
}

/**
 * Hook to fetch all available badges
 */
export function useAllBadges() {
  const { data, error, isLoading } = useSWR<{
    badges: BadgeDefinition[];
    total: number;
  }>('/api/v1/badges/all');

  return {
    badges: data?.badges,
    total: data?.total,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch user's earned badges
 */
export function useUserBadges(userId: number) {
  const { data, error, isLoading, mutate } = useSWR<{
    userId: number;
    badges: UserBadge[];
    total: number;
  }>(userId ? `/api/v1/badges/user/${userId}` : null);

  return {
    badges: data?.badges,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch badge progress for current user
 */
export function useBadgeProgress(userId: number) {
  const { data, error, isLoading } = useSWR<{
    userId: number;
    progress: BadgeProgress;
  }>(userId ? `/api/v1/badges/user/${userId}/progress` : null);

  return {
    progress: data?.progress,
    isLoading,
    error,
  };
}

/**
 * Award a community badge to a user (admin only)
 */
export async function awardCommunityBadge(
  userId: number,
  badgeType: string
): Promise<{ badge: UserBadge }> {
  const response = await axios.post(
    `/api/v1/badges/user/${userId}/award/${badgeType}`
  );
  return response.data;
}

/**
 * Manually trigger badge check for a user (admin only)
 */
export async function checkUserBadges(userId: number): Promise<{
  userId: number;
  newBadges: UserBadge[];
  count: number;
}> {
  const response = await axios.post(`/api/v1/badges/user/${userId}/check`);
  return response.data;
}

/**
 * Remove a badge from a user (admin only)
 */
export async function removeBadge(
  userId: number,
  badgeId: number
): Promise<void> {
  await axios.delete(`/api/v1/badges/user/${userId}/badge/${badgeId}`);
}
