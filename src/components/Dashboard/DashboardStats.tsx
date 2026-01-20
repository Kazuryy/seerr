import { useUserStats } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftRightIcon,
  EyeIcon,
  FilmIcon,
  StarIcon,
  TvIcon,
} from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.DashboardStats', {
  moviesWatched: 'Movies',
  episodesWatched: 'Episodes',
  totalWatches: 'Total Watches',
  reviewsWritten: 'Reviews',
  averageRating: 'Avg Rating',
});

interface DashboardStatsProps {
  userId: number;
}

const DashboardStats = ({ userId }: DashboardStatsProps) => {
  const intl = useIntl();
  const { data: stats, isLoading } = useUserStats(userId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-gray-700 bg-gray-800 p-4"
          >
            <div className="h-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: messages.moviesWatched,
      value: stats?.watchStats?.movieWatches ?? 0,
      icon: FilmIcon,
      color: 'bg-blue-600',
    },
    {
      label: messages.episodesWatched,
      value: stats?.watchStats?.episodeWatches ?? 0,
      icon: TvIcon,
      color: 'bg-purple-600',
    },
    {
      label: messages.totalWatches,
      value: stats?.watchStats?.totalWatches ?? 0,
      icon: EyeIcon,
      color: 'bg-indigo-600',
    },
    {
      label: messages.reviewsWritten,
      value: stats?.reviewStats?.totalReviews ?? 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-green-600',
    },
    {
      label: messages.averageRating,
      value:
        stats?.reviewStats?.averageRating !== undefined
          ? `${stats.reviewStats.averageRating.toFixed(1)}/10`
          : '-',
      icon: StarIcon,
      color: 'bg-yellow-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-700 bg-gray-800 p-3 sm:p-4"
        >
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md ${stat.color} p-2`}>
              <stat.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-400">
                {intl.formatMessage(stat.label)}
              </p>
              <p className="text-lg font-bold text-white sm:text-xl">
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
