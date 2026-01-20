import Alert from '@app/components/Common/Alert';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { BadgeDefinition, UserBadge } from '@app/hooks/useBadges';
import { useAllBadges, useUserBadges } from '@app/hooks/useBadges';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';
import Badge from './Badge';

const messages = defineMessages('components.Badges.BadgeGrid', {
  noBadges: 'No badges earned yet',
  startEarning: 'Start watching and reviewing to earn badges!',
  watching: 'Watching',
  reviews: 'Reviews',
  social: 'Social',
  streaks: 'Streaks',
  special: 'Special',
  community: 'Community',
  earned: '{count} / {total} Earned',
});

interface BadgeGridProps {
  userId: number;
  showLocked?: boolean;
}

const BadgeGrid = ({ userId, showLocked = false }: BadgeGridProps) => {
  const intl = useIntl();
  const { badges: allBadges, isLoading: allLoading } = useAllBadges();
  const {
    badges: userBadges,
    total,
    isLoading: userLoading,
    error,
  } = useUserBadges(userId);

  if (allLoading || userLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load badges
      </Alert>
    );
  }

  // Create a map of earned badges for quick lookup
  const earnedBadgesMap = new Map<string, UserBadge>();
  userBadges?.forEach((badge) => {
    earnedBadgesMap.set(badge.type, badge);
  });

  // Group badges by category
  const badgesByCategory = allBadges?.reduce(
    (acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    },
    {} as Record<string, BadgeDefinition[]>
  );

  const categoryOrder: BadgeDefinition['category'][] = [
    'watching',
    'reviews',
    'social',
    'streaks',
    'special',
    'community',
  ];

  // Filter to only show earned badges if showLocked is false
  const filteredCategories = categoryOrder.map((category) => {
    const categoryBadges = badgesByCategory?.[category] || [];
    if (showLocked) {
      return { category, badges: categoryBadges };
    }
    return {
      category,
      badges: categoryBadges.filter((badge) =>
        earnedBadgesMap.has(badge.type)
      ),
    };
  });

  const hasAnyBadges = filteredCategories.some(
    ({ badges }) => badges.length > 0
  );

  if (!hasAnyBadges && !showLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl opacity-50">🏆</div>
        <p className="text-xl font-semibold text-white">
          {intl.formatMessage(messages.noBadges)}
        </p>
        <p className="mt-2 text-gray-400">
          {intl.formatMessage(messages.startEarning)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Summary */}
      {showLocked && (
        <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {intl.formatMessage(messages.earned, {
              count: total || 0,
              total: allBadges?.length || 0,
            })}
          </p>
        </div>
      )}

      {/* Badge Categories */}
      {filteredCategories.map(({ category, badges }) => {
        if (badges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {intl.formatMessage(messages[category])}
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => {
                const earnedBadge = earnedBadgesMap.get(badge.type);
                return (
                  <Badge
                    key={badge.type}
                    badge={badge}
                    earnedAt={earnedBadge?.earnedAt}
                    locked={!earnedBadge && showLocked}
                    size="md"
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeGrid;
