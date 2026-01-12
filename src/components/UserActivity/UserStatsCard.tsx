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

        {/* Rating Distribution */}
        {data.reviewStats.ratingDistribution.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-4 text-lg font-medium text-white">
              {intl.formatMessage(messages.ratingDistribution)}
            </h3>
            <div className="space-y-2">
              {data.reviewStats.ratingDistribution
                .sort((a, b) => b.rating - a.rating)
                .map((item) => (
                  <div
                    key={item.rating}
                    className="flex items-center space-x-3"
                  >
                    <div className="w-12 text-right text-sm font-medium text-gray-400">
                      {item.rating}/10
                    </div>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded bg-gray-700">
                        <div
                          className="h-full bg-yellow-500 transition-all"
                          style={{
                            width: `${(item.count / maxRatingCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-sm font-medium text-gray-300">
                      {item.count}
                    </div>
                  </div>
                ))}
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
