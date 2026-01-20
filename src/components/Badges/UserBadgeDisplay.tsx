import { useUserBadges, type UserBadge } from '@app/hooks/useBadges';
import { useMemo } from 'react';
import Badge from './Badge';

interface UserBadgeDisplayProps {
  userId: number;
  limit?: number;
  size?: 'sm' | 'md' | 'lg';
}

// Badge tier hierarchy - higher index = higher tier
const BADGE_TIERS: Record<string, string[]> = {
  // Movies watching tiers
  movies: [
    'MOVIES_WATCHED_10',
    'MOVIES_WATCHED_50',
    'MOVIES_WATCHED_100',
    'MOVIES_WATCHED_250',
    'MOVIES_WATCHED_500',
    'MOVIES_WATCHED_1000',
  ],
  // TV episodes tiers
  tv: [
    'TV_EPISODES_100',
    'TV_EPISODES_500',
    'TV_EPISODES_1000',
    'TV_EPISODES_5000',
  ],
  // Reviews tiers
  reviews: [
    'REVIEWS_WRITTEN_1',
    'REVIEWS_WRITTEN_10',
    'REVIEWS_WRITTEN_50',
    'REVIEWS_WRITTEN_100',
  ],
  // Social/likes tiers
  social: [
    'REVIEW_LIKES_RECEIVED_1',
    'REVIEW_LIKES_RECEIVED_50',
    'REVIEW_LIKES_RECEIVED_100',
    'REVIEW_LIKES_RECEIVED_500',
  ],
  // Streak tiers
  streaks: [
    'WATCHING_STREAK_7',
    'WATCHING_STREAK_30',
    'WATCHING_STREAK_100',
  ],
};

// Get the category for a badge type
const getBadgeCategory = (badgeType: string): string | null => {
  for (const [category, tiers] of Object.entries(BADGE_TIERS)) {
    if (tiers.includes(badgeType)) {
      return category;
    }
  }
  return null; // Non-tiered badge (special, community, etc.)
};

// Get the tier level for a badge (higher = better)
const getBadgeTierLevel = (badgeType: string): number => {
  for (const tiers of Object.values(BADGE_TIERS)) {
    const index = tiers.indexOf(badgeType);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
};

/**
 * Get only the highest badge per category, plus special badges
 */
const getHighestBadgesPerCategory = (badges: UserBadge[]): UserBadge[] => {
  const categoryBest = new Map<string, UserBadge>();
  const specialBadges: UserBadge[] = [];

  for (const badge of badges) {
    const category = getBadgeCategory(badge.type);

    if (category === null) {
      // Special/community badge - always include
      specialBadges.push(badge);
    } else {
      const existing = categoryBest.get(category);
      if (!existing) {
        categoryBest.set(category, badge);
      } else {
        // Compare tier levels
        const existingLevel = getBadgeTierLevel(existing.type);
        const newLevel = getBadgeTierLevel(badge.type);
        if (newLevel > existingLevel) {
          categoryBest.set(category, badge);
        }
      }
    }
  }

  // Combine: special badges first, then highest tiered badges
  return [...specialBadges, ...Array.from(categoryBest.values())];
};

/**
 * Display a user's top badges inline (e.g., next to their name in reviews)
 * Shows only the highest tier badge per category
 */
const UserBadgeDisplay = ({
  userId,
  limit = 3,
  size = 'sm',
}: UserBadgeDisplayProps) => {
  const { badges } = useUserBadges(userId);

  // Filter to show only highest badge per category
  const displayBadges = useMemo(() => {
    if (!badges || badges.length === 0) return [];
    const highestBadges = getHighestBadgesPerCategory(badges);
    return highestBadges.slice(0, limit);
  }, [badges, limit]);

  // Count total unique categories/special badges for +N display
  const totalUniqueBadges = useMemo(() => {
    if (!badges) return 0;
    return getHighestBadgesPerCategory(badges).length;
  }, [badges]);

  if (displayBadges.length === 0) {
    return null;
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      {displayBadges.map((badge) => (
        <Badge
          key={badge.id}
          badge={badge}
          earnedAt={badge.earnedAt}
          size={size}
        />
      ))}
      {totalUniqueBadges > limit && (
        <span
          className="rounded-full bg-gray-600/50 px-1.5 py-0.5 text-xs text-gray-400"
          title={`${totalUniqueBadges - limit} more badges`}
        >
          +{totalUniqueBadges - limit}
        </span>
      )}
    </div>
  );
};

export default UserBadgeDisplay;
