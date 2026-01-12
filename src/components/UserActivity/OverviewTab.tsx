import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { UserStats } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import {
  ClockIcon,
  FilmIcon,
  StarIcon,
  TvIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity.OverviewTab', {
  quickStats: 'Quick Stats',
  movies: 'Movies',
  watched: 'watched',
  rewatched: 'rewatched',
  episodes: 'Episodes',
  seen: 'seen',
  series: 'series',
  watchTime: 'Watch Time',
  hours: 'hrs',
  avgRating: 'Avg Rating',
  reviews: 'reviews',
  recentActivity: 'Recent Activity',
  viewAllActivity: 'View all activity',
  yourTopRated: 'Your Top Rated',
  viewFullRankings: 'View full rankings',
  noActivity: 'No activity yet',
  startWatching: 'Start tracking your movies and shows!',
});

interface OverviewTabProps {
  stats?: UserStats;
  isLoading: boolean;
}

const OverviewTab = ({ stats, isLoading }: OverviewTabProps) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FilmIcon className="mb-4 h-16 w-16" />
        <p className="mb-2 text-lg font-medium">
          {intl.formatMessage(messages.noActivity)}
        </p>
        <p className="text-sm">{intl.formatMessage(messages.startWatching)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-white">
          {intl.formatMessage(messages.quickStats)}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Movies Card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-2 flex items-center space-x-2">
              <FilmIcon className="h-6 w-6 text-indigo-400" />
              <h3 className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.movies)}
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {stats.watchStats.movieWatches || 0}
              </p>
              <p className="text-xs text-gray-500">
                {intl.formatMessage(messages.watched)}
              </p>
            </div>
          </div>

          {/* Episodes Card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-2 flex items-center space-x-2">
              <TvIcon className="h-6 w-6 text-indigo-400" />
              <h3 className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.episodes)}
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {stats.watchStats.episodeWatches || 0}
              </p>
              <p className="text-xs text-gray-500">
                {intl.formatMessage(messages.seen)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.watchStats.tvWatches || 0}{' '}
                {intl.formatMessage(messages.series)}
              </p>
            </div>
          </div>

          {/* Total Watches Card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-2 flex items-center space-x-2">
              <ClockIcon className="h-6 w-6 text-indigo-400" />
              <h3 className="text-sm font-medium text-gray-400">
                Total Watches
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {stats.watchStats.totalWatches || 0}
              </p>
              <p className="text-xs text-gray-500">all media</p>
            </div>
          </div>

          {/* Average Rating Card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-2 flex items-center space-x-2">
              <StarIcon className="h-6 w-6 text-yellow-400" />
              <h3 className="text-sm font-medium text-gray-400">
                {intl.formatMessage(messages.avgRating)}
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {stats.reviewStats.averageRating
                  ? `${stats.reviewStats.averageRating.toFixed(1)}/10`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                {stats.reviewStats.totalReviews || 0}{' '}
                {intl.formatMessage(messages.reviews)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Placeholder for now */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {intl.formatMessage(messages.recentActivity)}
          </h2>
          <Link
            href="?tab=watch"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {intl.formatMessage(messages.viewAllActivity)}
          </Link>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-400">
          <p className="text-sm">
            Activity feed coming soon - switch to Watch History tab to see your
            watches
          </p>
        </div>
      </div>

      {/* Top Rated - Placeholder for now */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {intl.formatMessage(messages.yourTopRated)}
          </h2>
          <Link
            href="?tab=reviews"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {intl.formatMessage(messages.viewFullRankings)}
          </Link>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-400">
          <p className="text-sm">
            Top rated section coming soon - switch to Reviews tab to see your
            reviews
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
