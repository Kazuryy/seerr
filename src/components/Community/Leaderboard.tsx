import Alert from '@app/components/Common/Alert';
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
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Period Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              period === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.week)}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              period === 'month'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.month)}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              period === 'year'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.year)}
          </button>
          <button
            onClick={() => setPeriod('alltime')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              period === 'alltime'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.alltime)}
          </button>
        </div>

        {/* Metric Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setMetric('reviews')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              metric === 'reviews'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.reviews)}
          </button>
          <button
            onClick={() => setMetric('likes')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              metric === 'likes'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.likes)}
          </button>
          <button
            onClick={() => setMetric('watches')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
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
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-750 border-b border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  {intl.formatMessage(messages.rank)}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  {intl.formatMessage(messages.user)}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
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
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {entry.rank <= 3 && (
                        <TrophyIcon
                          className={`h-5 w-5 ${getRankColor(entry.rank)}`}
                        />
                      )}
                      <span
                        className={`text-lg font-bold ${getRankColor(
                          entry.rank
                        )}`}
                      >
                        #{entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/users/${entry.user.id}`}
                      className="flex items-center space-x-3 hover:text-indigo-400"
                    >
                      <img
                        src={
                          entry.user.avatar
                            ? `/api/v1${entry.user.avatar}`
                            : '/avatars/default.png'
                        }
                        alt={entry.user.displayName}
                        className="h-10 w-10 rounded-full"
                      />
                      <span className="font-medium text-white">
                        {entry.user.displayName}
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <span className="text-lg font-semibold text-indigo-400">
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
