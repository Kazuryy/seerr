import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import {
  useReviews,
  useUserStats,
  useWatchHistory,
} from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import ReviewsList from './ReviewsList';
import UserStatsCard from './UserStatsCard';
import WatchHistoryList from './WatchHistoryList';

const messages = defineMessages('components.UserActivity', {
  title: 'Activity',
  watchHistory: 'Watch History',
  reviews: 'Reviews',
  statistics: 'Statistics',
  noActivity: 'No activity yet',
  allMedia: 'All',
  movies: 'Movies',
  tvShows: 'TV Shows',
});

type TabType = 'watch' | 'reviews' | 'stats';

const UserActivity = () => {
  const intl = useIntl();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const userId = Number(router.query.userId);
  const [activeTab, setActiveTab] = useState<TabType>('watch');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    'all' | 'movie' | 'tv'
  >('all');

  const { data: watchData, isLoading: watchLoading } = useWatchHistory({
    mediaType: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
    take: 20,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useReviews({
    userId,
    take: 20,
  });

  const { data: statsData, isLoading: statsLoading } = useUserStats(userId);

  if (!currentUser) {
    return <LoadingSpinner />;
  }

  if (!userId || isNaN(userId)) {
    return <Error statusCode={404} />;
  }

  const isOwnProfile = currentUser.id === userId;

  return (
    <div className="px-4 py-6">
      <PageTitle
        title={[
          intl.formatMessage(messages.title),
          isOwnProfile ? 'Your Profile' : `User ${userId}`,
        ]}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          {intl.formatMessage(messages.title)}
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('watch')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'watch'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.watchHistory)}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'reviews'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.reviews)}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'stats'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.statistics)}
          </button>
        </nav>
      </div>

      {/* Media Type Filter (for watch history) */}
      {activeTab === 'watch' && (
        <div className="mb-4 flex space-x-2">
          <button
            onClick={() => setMediaTypeFilter('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              mediaTypeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.allMedia)}
          </button>
          <button
            onClick={() => setMediaTypeFilter('movie')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              mediaTypeFilter === 'movie'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.movies)}
          </button>
          <button
            onClick={() => setMediaTypeFilter('tv')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              mediaTypeFilter === 'tv'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.tvShows)}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'watch' && (
          <WatchHistoryList data={watchData} isLoading={watchLoading} />
        )}
        {activeTab === 'reviews' && (
          <ReviewsList data={reviewsData} isLoading={reviewsLoading} />
        )}
        {activeTab === 'stats' && (
          <UserStatsCard data={statsData} isLoading={statsLoading} />
        )}
      </div>
    </div>
  );
};

export default UserActivity;
