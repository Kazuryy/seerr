import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { UserStats } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftIcon,
  FilmIcon,
  StarIcon,
  TvIcon,
} from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity', {
  watchStatistics: 'Watch Statistics',
  reviewStatistics: 'Review Statistics',
  totalWatches: 'Total Watches',
  movieWatches: 'Movies',
  tvWatches: 'TV Shows',
  episodeWatches: 'Episodes',
  totalReviews: 'Total Reviews',
  publicReviews: 'Public',
  privateReviews: 'Private',
  averageRating: 'Average Rating',
  ratingDistribution: 'Rating Distribution',
  noStats: 'No statistics available yet',
});

interface UserStatsCardProps {
  data?: UserStats;
  isLoading: boolean;
}

const UserStatsCard = ({ data, isLoading }: UserStatsCardProps) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <StarIcon className="mb-4 h-16 w-16" />
        <p>{intl.formatMessage(messages.noStats)}</p>
      </div>
    );
  }

  const maxRatingCount = Math.max(
    ...data.reviewStats.ratingDistribution.map((r) => r.count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Watch Statistics */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">
          {intl.formatMessage(messages.watchStatistics)}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<FilmIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.totalWatches)}
            value={data.watchStats.totalWatches}
            color="indigo"
          />
          <StatCard
            icon={<FilmIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.movieWatches)}
            value={data.watchStats.movieWatches}
            color="blue"
          />
          <StatCard
            icon={<TvIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.tvWatches)}
            value={data.watchStats.tvWatches}
            color="purple"
          />
          <StatCard
            icon={<TvIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.episodeWatches)}
            value={data.watchStats.episodeWatches}
            color="pink"
          />
        </div>
      </div>

      {/* Review Statistics */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">
          {intl.formatMessage(messages.reviewStatistics)}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ChatBubbleLeftIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.totalReviews)}
            value={data.reviewStats.totalReviews}
            color="green"
          />
          <StatCard
            icon={<ChatBubbleLeftIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.publicReviews)}
            value={data.reviewStats.publicReviews}
            color="emerald"
          />
          <StatCard
            icon={<ChatBubbleLeftIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.privateReviews)}
            value={data.reviewStats.privateReviews}
            color="gray"
          />
          <StatCard
            icon={<StarIcon className="h-8 w-8" />}
            label={intl.formatMessage(messages.averageRating)}
            value={
              data.reviewStats.averageRating > 0
                ? data.reviewStats.averageRating.toFixed(1)
                : '—'
            }
            color="yellow"
          />
        </div>

        {/* Rating Distribution - Vertical Bar Chart */}
        {data.reviewStats.ratingDistribution.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-medium text-white">
              {intl.formatMessage(messages.ratingDistribution)}
            </h3>
            <div className="grid grid-cols-10 gap-1 sm:gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
                const item = data.reviewStats.ratingDistribution.find(
                  (r) => r.rating === rating
                );
                const count = item?.count || 0;
                const heightPercent =
                  maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
                const getRatingBarColor = (r: number) => {
                  if (r >= 9) return 'from-emerald-500 to-emerald-400';
                  if (r >= 7) return 'from-green-500 to-green-400';
                  if (r >= 5) return 'from-yellow-500 to-yellow-400';
                  if (r >= 3) return 'from-orange-500 to-orange-400';
                  return 'from-red-500 to-red-400';
                };

                return (
                  <div
                    key={rating}
                    className="flex flex-col items-center"
                    title={`${rating}/10: ${count} reviews`}
                  >
                    {/* Bar container */}
                    <div className="relative flex h-24 w-full items-end justify-center rounded-t-md bg-gray-700/50 sm:h-32">
                      <div
                        className={`w-full rounded-t-md bg-gradient-to-t ${getRatingBarColor(rating)} transition-all duration-500`}
                        style={{
                          height: `${Math.max(heightPercent, count > 0 ? 8 : 0)}%`,
                        }}
                      />
                      {/* Count label on top of bar */}
                      {count > 0 && (
                        <span className="absolute top-1 text-xs font-semibold text-white drop-shadow-md">
                          {count}
                        </span>
                      )}
                    </div>
                    {/* Rating label */}
                    <div className="mt-1 flex h-6 w-full items-center justify-center rounded-b-md bg-gray-700">
                      <span className="text-xs font-bold text-gray-300 sm:text-sm">
                        {rating}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>← Lower</span>
              <span className="font-medium text-gray-400">Rating Scale</span>
              <span>Higher →</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => {
  const colorClasses = {
    indigo: 'text-indigo-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
    green: 'text-green-500',
    emerald: 'text-emerald-500',
    gray: 'text-gray-500',
    yellow: 'text-yellow-500',
  };

  return (
    <div className="rounded-lg bg-gray-700 p-4">
      <div
        className={`mb-2 flex items-center justify-center ${
          colorClasses[color as keyof typeof colorClasses]
        }`}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
};

export default UserStatsCard;
