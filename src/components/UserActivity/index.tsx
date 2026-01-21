import BadgeGrid from '@app/components/Badges/BadgeGrid';
import BadgeProgress from '@app/components/Badges/BadgeProgress';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import { SeriesProgressList } from '@app/components/SeriesProgress';
import {
  useReviews,
  useTopRated,
  useUserStats,
  useWatchHistory,
} from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import OverviewTab from './OverviewTab';
import ReviewsList from './ReviewsList';
import UserStatsCard from './UserStatsCard';
import WatchHistoryList from './WatchHistoryList';

const messages = defineMessages('components.UserActivity', {
  title: 'Activity',
  overview: 'Overview',
  watchHistory: 'Watch History',
  seriesProgress: 'Series',
  reviews: 'Reviews',
  statistics: 'Statistics',
  badges: 'Badges',
  noActivity: 'No activity yet',
  allMedia: 'All',
  movies: 'Movies',
  tvShows: 'TV Shows',
});

type TabType = 'overview' | 'watch' | 'series' | 'reviews' | 'stats' | 'badges';

const UserActivity = () => {
  const intl = useIntl();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const userId = Number(router.query.userId);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    'all' | 'movie' | 'tv'
  >('all');

  // Read tab from URL query parameter
  useEffect(() => {
    const tab = router.query.tab as string;
    if (
      tab &&
      ['overview', 'watch', 'series', 'reviews', 'stats', 'badges'].includes(
        tab
      )
    ) {
      setActiveTab(tab as TabType);
    }
  }, [router.query.tab]);

  const { data: watchData, isLoading: watchLoading } = useWatchHistory({
    mediaType: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
    take: 20,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useReviews({
    userId,
    take: 20,
  });

  // Fetch recent activity for Overview tab (limited to 10 items)
  const { data: recentWatchData, isLoading: recentWatchLoading } =
    useWatchHistory({
      take: 10,
    });

  const { data: recentReviewsData, isLoading: recentReviewsLoading } =
    useReviews({
      userId,
      take: 10,
    });

  // Fetch top-rated items for Overview tab
  const { data: topRatedData, isLoading: topRatedLoading } = useTopRated({
    take: 5,
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
    <div className="px-2 py-4 sm:px-4 sm:py-6">
      <PageTitle
        title={[
          intl.formatMessage(messages.title),
          isOwnProfile ? 'Your Profile' : `User ${userId}`,
        ]}
      />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {intl.formatMessage(messages.title)}
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-700 sm:mb-6">
        <nav className="-mb-px flex space-x-4 overflow-x-auto sm:space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.overview)}
          </button>
          <button
            onClick={() => setActiveTab('watch')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'watch'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.watchHistory)}
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'series'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.seriesProgress)}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'reviews'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.reviews)}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'stats'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.statistics)}
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'badges'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.badges)}
          </button>
        </nav>
      </div>

      {/* Media Type Filter (for watch history) */}
      {activeTab === 'watch' && (
        <div className="mb-4 flex flex-wrap gap-2 sm:space-x-2">
          <button
            onClick={() => setMediaTypeFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              mediaTypeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.allMedia)}
          </button>
          <button
            onClick={() => setMediaTypeFilter('movie')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              mediaTypeFilter === 'movie'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.movies)}
          </button>
          <button
            onClick={() => setMediaTypeFilter('tv')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
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
        {activeTab === 'overview' && (
          <OverviewTab
            stats={statsData}
            isLoading={statsLoading}
            recentWatches={recentWatchData?.results}
            recentReviews={recentReviewsData?.results}
            topRated={topRatedData}
            isLoadingActivity={recentWatchLoading || recentReviewsLoading}
            isLoadingTopRated={topRatedLoading}
          />
        )}
        {activeTab === 'watch' && (
          <WatchHistoryList data={watchData} isLoading={watchLoading} />
        )}
        {activeTab === 'series' && <SeriesProgressList take={50} />}
        {activeTab === 'reviews' && (
          <ReviewsList data={reviewsData} isLoading={reviewsLoading} />
        )}
        {activeTab === 'stats' && (
          <UserStatsCard data={statsData} isLoading={statsLoading} />
        )}
        {activeTab === 'badges' && (
          <div className="space-y-6">
            {isOwnProfile && (
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
                <BadgeProgress userId={userId} />
              </div>
            )}
            <BadgeGrid userId={userId} showLocked={isOwnProfile} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivity;
