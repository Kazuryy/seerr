import Alert from '@app/components/Common/Alert';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Slider from '@app/components/Slider';
import StatsTitleCard from '@app/components/Community/StatsTitleCard';
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Total Users */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-indigo-600 p-2 sm:p-3">
              <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalUsers)}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">{data.totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-600 p-2 sm:p-3">
              <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.activeUsers)}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {data.activeUsersThisMonth}
              </p>
            </div>
          </div>
        </div>

        {/* Total Watches */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-purple-600 p-2 sm:p-3">
              <EyeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalWatches)}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {data.totalWatches}
              </p>
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-blue-600 p-2 sm:p-3">
              <ChatBubbleLeftRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.totalReviews)}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {data.totalReviews}
              </p>
            </div>
          </div>
        </div>

        {/* Average Rating */}
        {data.averageCommunityRating !== undefined && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-yellow-600 p-2 sm:p-3">
                <StarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-400">
                  {intl.formatMessage(messages.averageRating)}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {data.averageCommunityRating.toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Most Watched This Week */}
      <div>
        <div className="slider-header">
          <div className="slider-title">
            <span>{intl.formatMessage(messages.mostWatchedThisWeek)}</span>
          </div>
        </div>
        <Slider
          sliderKey="most-watched-week"
          isLoading={false}
          isEmpty={data.mostWatchedThisWeek.length === 0}
          items={data.mostWatchedThisWeek.map((item) => (
            <StatsTitleCard
              key={item.tmdbId}
              id={item.id}
              tmdbId={item.tmdbId}
              type={item.mediaType}
              watchCount={item.watchCount}
            />
          ))}
        />
      </div>

      {/* Top Rated This Month */}
      <div>
        <div className="slider-header">
          <div className="slider-title">
            <span>{intl.formatMessage(messages.topRatedThisMonth)}</span>
          </div>
        </div>
        <Slider
          sliderKey="top-rated-month"
          isLoading={false}
          isEmpty={data.topRatedThisMonth.length === 0}
          items={data.topRatedThisMonth.map((item) => (
            <StatsTitleCard
              key={item.tmdbId}
              id={item.id}
              tmdbId={item.tmdbId}
              type={item.mediaType}
              averageRating={item.averageRating}
              reviewCount={item.reviewCount}
            />
          ))}
        />
      </div>
    </div>
  );
};

export default CommunityStats;
