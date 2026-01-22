import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useLeaderboard } from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import { EyeIcon } from '@heroicons/react/24/outline';
import { TrophyIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.LeaderboardWidget', {
  leaderboard: 'Top Watchers',
  viewAll: 'View All',
  noData: 'No data yet',
  watchCount: '{count, plural, one {# watch} other {# watches}}',
});

const LeaderboardWidget = () => {
  const intl = useIntl();
  const { data, isLoading } = useLeaderboard({
    period: 'month',
    metric: 'watches',
    limit: 5,
  });

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-500';
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <EyeIcon className="mr-2 h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">
            {intl.formatMessage(messages.leaderboard)}
          </h3>
        </div>
        <Link
          href="/community?tab=leaderboard"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          {intl.formatMessage(messages.viewAll)} →
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data && data.leaderboard.length > 0 ? (
        <div className="space-y-2">
          {data.leaderboard.map((entry) => (
            <Link
              key={entry.user.id}
              href={`/users/${entry.user.id}`}
              className="flex items-center justify-between rounded-md bg-gray-700/50 p-2 transition-colors hover:bg-gray-700"
            >
              <div className="flex items-center space-x-3">
                <div className="flex w-6 items-center justify-center">
                  {entry.rank <= 3 ? (
                    <TrophyIcon
                      className={`h-4 w-4 ${getRankColor(entry.rank)}`}
                    />
                  ) : (
                    <span className="text-sm text-gray-500">#{entry.rank}</span>
                  )}
                </div>
                <img
                  src={entry.user.avatar || '/avatars/default.png'}
                  alt={entry.user.displayName}
                  className="h-7 w-7 rounded-full"
                />
                <span className="text-sm font-medium text-white">
                  {entry.user.displayName}
                </span>
              </div>
              <span className="text-sm font-semibold text-indigo-400">
                {intl.formatMessage(messages.watchCount, {
                  count: entry.value,
                })}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-gray-400">
          {intl.formatMessage(messages.noData)}
        </p>
      )}
    </div>
  );
};

export default LeaderboardWidget;
