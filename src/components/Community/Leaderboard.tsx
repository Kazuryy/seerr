import Alert from '@app/components/Common/Alert';
import UserBadgeDisplay from '@app/components/Badges/UserBadgeDisplay';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useLeaderboard } from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import { TrophyIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Community.Leaderboard', {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  alltime: 'All Time',
  reviews: 'Most Reviews',
  likes: 'Most Liked',
  watches: 'Most Watches',
  noData: 'No data available',
  rank: 'Rank',
  user: 'User',
  value: 'Count',
});

const Leaderboard = () => {
  const intl = useIntl();
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'alltime'>(
    'month'
  );
  const [metric, setMetric] = useState<'reviews' | 'likes' | 'watches'>(
    'reviews'
  );

  const { data, isLoading, error } = useLeaderboard({
    period,
    metric,
    limit: 10,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load leaderboard
      </Alert>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-500';
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:gap-4">
        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 sm:space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              period === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.week)}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              period === 'month'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.month)}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              period === 'year'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.year)}
          </button>
          <button
            onClick={() => setPeriod('alltime')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              period === 'alltime'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.alltime)}
          </button>
        </div>

        {/* Metric Filter */}
        <div className="flex flex-wrap gap-2 sm:space-x-2">
          <button
            onClick={() => setMetric('reviews')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              metric === 'reviews'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.reviews)}
          </button>
          <button
            onClick={() => setMetric('likes')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              metric === 'likes'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.likes)}
          </button>
          <button
            onClick={() => setMetric('watches')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              metric === 'watches'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.watches)}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      {data && data.leaderboard.length > 0 ? (
        <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-750 border-b border-gray-700">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-6 sm:py-3">
                  {intl.formatMessage(messages.rank)}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-6 sm:py-3">
                  {intl.formatMessage(messages.user)}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-400 sm:px-6 sm:py-3">
                  {intl.formatMessage(messages.value)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.leaderboard.map((entry) => (
                <tr
                  key={entry.user.id}
                  className="transition-colors hover:bg-gray-700"
                >
                  <td className="whitespace-nowrap px-3 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {entry.rank <= 3 && (
                        <TrophyIcon
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${getRankColor(entry.rank)}`}
                        />
                      )}
                      <span
                        className={`text-base font-bold sm:text-lg ${getRankColor(
                          entry.rank
                        )}`}
                      >
                        #{entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-6 sm:py-4">
                    <Link
                      href={`/users/${entry.user.id}`}
                      className="flex items-center space-x-2 hover:text-indigo-400 sm:space-x-3"
                    >
                      <img
                        src={entry.user.avatar || '/avatars/default.png'}
                        alt={entry.user.displayName}
                        className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <span className="text-sm font-medium text-white sm:text-base">
                            {entry.user.displayName}
                          </span>
                          <UserBadgeDisplay userId={entry.user.id} limit={2} size="sm" />
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-6 sm:py-4">
                    <span className="text-base font-semibold text-indigo-400 sm:text-lg">
                      {entry.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16 px-4">
          <p className="text-xl font-semibold text-white">
            {intl.formatMessage(messages.noData)}
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
