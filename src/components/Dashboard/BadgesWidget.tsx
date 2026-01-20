import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Badge from '@app/components/Badges/Badge';
import type { UserBadge } from '@app/hooks/useBadges';
import { useAllBadges, useUserBadges } from '@app/hooks/useBadges';
import defineMessages from '@app/utils/defineMessages';
import { SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.BadgesWidget', {
  badges: 'Your Badges',
  viewAll: 'View All',
  noBadges: 'No badges earned yet',
  earnBadges: 'Start watching and reviewing!',
  earned: '{count} earned',
});

interface BadgesWidgetProps {
  userId: number;
}

const BadgesWidget = ({ userId }: BadgesWidgetProps) => {
  const intl = useIntl();
  const { badges: allBadges, isLoading: allLoading } = useAllBadges();
  const { badges: userBadges, total, isLoading: userLoading } = useUserBadges(userId);

  const isLoading = allLoading || userLoading;

  // Create a map of earned badges for quick lookup
  const earnedBadgesMap = new Map<string, UserBadge>();
  userBadges?.forEach((badge) => {
    earnedBadgesMap.set(badge.type, badge);
  });

  // Get the most recent earned badges (up to 6)
  const recentBadges = userBadges
    ?.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 6);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <SparklesIcon className="mr-2 h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-white">
            {intl.formatMessage(messages.badges)}
          </h3>
          {total !== undefined && total > 0 && (
            <span className="ml-2 rounded-full bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">
              {intl.formatMessage(messages.earned, { count: total })}
            </span>
          )}
        </div>
        <Link
          href={`/users/${userId}/activity?tab=badges`}
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          {intl.formatMessage(messages.viewAll)} →
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : recentBadges && recentBadges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recentBadges.map((userBadge) => {
            const badgeDefinition = allBadges?.find(
              (b) => b.type === userBadge.type
            );
            if (!badgeDefinition) return null;

            return (
              <Badge
                key={userBadge.type}
                badge={badgeDefinition}
                earnedAt={userBadge.earnedAt}
                size="sm"
              />
            );
          })}
        </div>
      ) : (
        <div className="py-4 text-center">
          <div className="mb-2 text-3xl opacity-50">🏆</div>
          <p className="text-sm text-gray-400">
            {intl.formatMessage(messages.noBadges)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {intl.formatMessage(messages.earnBadges)}
          </p>
        </div>
      )}
    </div>
  );
};

export default BadgesWidget;
