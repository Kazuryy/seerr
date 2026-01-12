import Alert from '@app/components/Common/Alert';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import TmdbTitleCard from '@app/components/TitleCard/TmdbTitleCard';
import { useCommunityStats } from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftRightIcon,
  EyeIcon,
  StarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Community.CommunityStats', {
  totalUsers: 'Total Users',
  activeUsers: 'Active This Month',
  totalWatches: 'Total Watches',
  totalReviews: 'Total Reviews',
  averageRating: 'Average Rating',
  mostWatchedThisWeek: 'Most Watched This Week',
  topRatedThisMonth: 'Top Rated This Month',
  noData: 'No data available',
  watches: '{count} watches',
  reviews: '{count} reviews',
  avgRating: 'Avg: {rating}/10',
});

const CommunityStats = () => {
  const intl = useIntl();
  const { data, isLoading, error } = useCommunityStats();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load community stats
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Users */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-indigo-600 p-3">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalUsers)}
              </p>
              <p className="text-2xl font-bold text-white">{data.totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-600 p-3">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.activeUsers)}
              </p>
              <p className="text-2xl font-bold text-white">
                {data.activeUsersThisMonth}
              </p>
            </div>
          </div>
        </div>

        {/* Total Watches */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-purple-600 p-3">
              <EyeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalWatches)}
              </p>
              <p className="text-2xl font-bold text-white">
                {data.totalWatches}
              </p>
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-blue-600 p-3">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalReviews)}
              </p>
              <p className="text-2xl font-bold text-white">
                {data.totalReviews}
              </p>
            </div>
          </div>
        </div>

        {/* Average Rating */}
        {data.averageCommunityRating !== undefined && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-yellow-600 p-3">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  {intl.formatMessage(messages.averageRating)}
                </p>
                <p className="text-2xl font-bold text-white">
                  {data.averageCommunityRating.toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Most Watched This Week */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-white">
          {intl.formatMessage(messages.mostWatchedThisWeek)}
        </h2>
        {data.mostWatchedThisWeek.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data.mostWatchedThisWeek.map((item) => (
              <div key={item.tmdbId} className="relative">
                <TmdbTitleCard
                  id={item.id}
                  tmdbId={item.tmdbId}
                  type={item.mediaType}
                />
                <div className="mt-2 flex items-center justify-center space-x-1 text-sm text-gray-400">
                  <EyeIcon className="h-4 w-4" />
                  <span>
                    {intl.formatMessage(messages.watches, {
                      count: item.watchCount,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800 py-8 px-4 text-center">
            <p className="text-gray-400">
              {intl.formatMessage(messages.noData)}
            </p>
          </div>
        )}
      </div>

      {/* Top Rated This Month */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-white">
          {intl.formatMessage(messages.topRatedThisMonth)}
        </h2>
        {data.topRatedThisMonth.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data.topRatedThisMonth.map((item) => (
              <div key={item.tmdbId} className="relative">
                <TmdbTitleCard
                  id={item.id}
                  tmdbId={item.tmdbId}
                  type={item.mediaType}
                />
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-center space-x-1 text-sm text-yellow-500">
                    <StarIcon className="h-4 w-4" />
                    <span>
                      {intl.formatMessage(messages.avgRating, {
                        rating: item.averageRating.toFixed(1),
                      })}
                    </span>
                  </div>
                  <div className="text-center text-xs text-gray-400">
                    {intl.formatMessage(messages.reviews, {
                      count: item.reviewCount,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800 py-8 px-4 text-center">
            <p className="text-gray-400">
              {intl.formatMessage(messages.noData)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityStats;
