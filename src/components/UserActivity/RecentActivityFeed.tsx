import RewatchBadge from '@app/components/ActivityDashboard/RewatchBadge';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { Review, WatchHistoryItem } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ClockIcon, FilmIcon, StarIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity.RecentActivityFeed', {
  watched: 'Watched',
  reviewed: 'Reviewed',
  season: 'S{season}',
  episode: 'E{episode}',
  timeAgo: '{time} ago',
  justNow: 'Just now',
  minutesAgo: '{count, plural, one {# minute ago} other {# minutes ago}}',
  hoursAgo: '{count, plural, one {# hour ago} other {# hours ago}}',
  daysAgo: '{count, plural, one {# day ago} other {# days ago}}',
  weeksAgo: '{count, plural, one {# week ago} other {# weeks ago}}',
  noActivity: 'No recent activity',
});

interface ActivityItem {
  type: 'watch' | 'review';
  timestamp: Date;
  data: WatchHistoryItem | Review;
}

interface RecentActivityFeedProps {
  watchHistory?: WatchHistoryItem[];
  reviews?: Review[];
  isLoading: boolean;
  limit?: number;
}

const RecentActivityFeed = ({
  watchHistory = [],
  reviews = [],
  isLoading,
  limit = 5,
}: RecentActivityFeedProps) => {
  const intl = useIntl();

  // Combine and sort activities by timestamp
  const activities = useMemo(() => {
    const watchActivities: ActivityItem[] = watchHistory.map((watch) => ({
      type: 'watch' as const,
      timestamp: new Date(watch.watchedAt),
      data: watch,
    }));

    const reviewActivities: ActivityItem[] = reviews.map((review) => ({
      type: 'review' as const,
      timestamp: new Date(review.createdAt),
      data: review,
    }));

    return [...watchActivities, ...reviewActivities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [watchHistory, reviews, limit]);

  // Calculate watch counts for rewatch badges
  const watchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    watchHistory.forEach((watch) => {
      const key = `${watch.mediaId}-${watch.seasonNumber ?? ''}-${
        watch.episodeNumber ?? ''
      }`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [watchHistory]);

  const getWatchCount = (watch: WatchHistoryItem): number => {
    const key = `${watch.mediaId}-${watch.seasonNumber ?? ''}-${
      watch.episodeNumber ?? ''
    }`;
    return watchCounts.get(key) || 1;
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));

    if (diffInMinutes < 1) {
      return intl.formatMessage(messages.justNow);
    } else if (diffInMinutes < 60) {
      return intl.formatMessage(messages.minutesAgo, { count: diffInMinutes });
    } else if (diffInHours < 24) {
      return intl.formatMessage(messages.hoursAgo, { count: diffInHours });
    } else if (diffInDays < 7) {
      return intl.formatMessage(messages.daysAgo, { count: diffInDays });
    } else {
      return intl.formatMessage(messages.weeksAgo, { count: diffInWeeks });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <ClockIcon className="mb-2 h-12 w-12" />
        <p className="text-sm">{intl.formatMessage(messages.noActivity)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        if (activity.type === 'watch') {
          const watch = activity.data as WatchHistoryItem;
          const watchCount = getWatchCount(watch);

          return (
            <div
              key={`watch-${watch.id}-${index}`}
              className="flex items-start space-x-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex-shrink-0">
                {watch.media?.posterPath ? (
                  <div className="relative h-16 w-12">
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${watch.media.posterPath}`}
                      alt={watch.media.title || ''}
                      fill
                      className="rounded object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded bg-gray-700">
                    <FilmIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  <RewatchBadge watchCount={watchCount} />
                </div>
                <div className="mt-1">
                  <span className="text-sm text-gray-400">
                    {intl.formatMessage(messages.watched)}{' '}
                  </span>
                  <Link
                    href={`/${watch.mediaType === 'movie' ? 'movie' : 'tv'}/${
                      watch.media?.tmdbId
                    }`}
                    className="font-medium text-white hover:text-indigo-400"
                  >
                    {watch.media?.title ||
                      `${watch.mediaType === 'movie' ? 'Movie' : 'TV Show'} #${
                        watch.media?.tmdbId
                      }`}
                  </Link>
                </div>
                {watch.seasonNumber !== undefined && (
                  <p className="mt-1 text-xs text-gray-500">
                    {intl.formatMessage(messages.season, {
                      season: watch.seasonNumber,
                    })}
                    {watch.episodeNumber !== undefined &&
                      ` ${intl.formatMessage(messages.episode, {
                        episode: watch.episodeNumber,
                      })}`}
                  </p>
                )}
              </div>
            </div>
          );
        } else {
          const review = activity.data as Review;

          return (
            <div
              key={`review-${review.id}-${index}`}
              className="flex items-start space-x-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex-shrink-0">
                <div className="flex h-16 w-12 items-center justify-center rounded bg-indigo-900 bg-opacity-50">
                  <StarIcon className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  {review.rating && (
                    <span className="flex items-center space-x-1 text-xs text-yellow-400">
                      <StarIcon className="h-3 w-3 fill-current" />
                      <span>{review.rating}/10</span>
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-sm text-gray-400">
                    {intl.formatMessage(messages.reviewed)}{' '}
                  </span>
                  <Link
                    href={`/${review.mediaType === 'movie' ? 'movie' : 'tv'}/${
                      review.media?.tmdbId
                    }`}
                    className="font-medium text-white hover:text-indigo-400"
                  >
                    {review.media?.title || `Media #${review.media?.tmdbId}`}
                  </Link>
                </div>
                {review.content && (
                  <p className="line-clamp-2 mt-2 text-sm text-gray-300">
                    {review.content}
                  </p>
                )}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default RecentActivityFeed;
