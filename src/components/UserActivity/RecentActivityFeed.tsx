import Badge from '@app/components/Common/Badge';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { Review, WatchHistoryItem } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useMemo } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity.RecentActivityFeed', {
  watched: 'Watched',
  reviewed: 'Reviewed',
  rating: 'Rating',
  season: 'S{season}',
  episode: 'E{episode}',
  noActivity: 'No recent activity',
  rewatch: 'Rewatch #{count}',
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (activities.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-12 text-white">
        <ClockIcon className="mb-4 h-16 w-16 text-gray-400" />
        <span className="text-2xl text-gray-400">
          {intl.formatMessage(messages.noActivity)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => {
        if (activity.type === 'watch') {
          const watch = activity.data as WatchHistoryItem;
          const watchCount = getWatchCount(watch);
          const mediaUrl = watch.media
            ? `/${watch.media.mediaType === 'movie' ? 'movie' : 'tv'}/${watch.media.tmdbId}`
            : '#';
          const title =
            watch.media?.title ||
            `${watch.mediaType === 'movie' ? 'Movie' : 'TV Show'} #${watch.media?.tmdbId}`;
          const relativeTime = Math.floor(
            (activity.timestamp.getTime() - Date.now()) / 1000
          );

          return (
            <div
              key={`watch-${watch.id}-${index}`}
              className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-4 text-gray-400 shadow-md ring-1 ring-gray-700 xl:h-28 xl:flex-row"
            >
              {/* Backdrop Image */}
              {watch.media?.backdropPath && (
                <div className="absolute inset-0 z-0 w-full overflow-hidden bg-cover bg-center xl:w-2/3">
                  <CachedImage
                    type="tmdb"
                    src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${watch.media.backdropPath}`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fill
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, rgba(31, 41, 55, 0.47) 0%, rgba(31, 41, 55, 1) 100%)',
                    }}
                  />
                </div>
              )}
              <div className="relative flex w-full flex-col justify-between overflow-hidden sm:flex-row">
                <div className="relative z-10 flex w-full items-center overflow-hidden pl-4 pr-4 sm:pr-0 xl:w-7/12 2xl:w-2/3">
                  <Link
                    href={mediaUrl}
                    className="relative h-auto w-12 flex-shrink-0 scale-100 transform-gpu overflow-hidden rounded-md transition duration-300 hover:scale-105"
                  >
                    <CachedImage
                      type="tmdb"
                      src={
                        watch.media?.posterPath
                          ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${watch.media.posterPath}`
                          : '/images/seerr_poster_not_found.png'
                      }
                      alt=""
                      sizes="100vw"
                      style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'cover',
                      }}
                      width={600}
                      height={900}
                    />
                  </Link>
                  <div className="flex flex-col justify-center overflow-hidden pl-2 xl:pl-4">
                    <div className="pt-0.5 text-xs font-medium text-white sm:pt-1">
                      {intl.formatMessage(messages.watched)}
                    </div>
                    <Link
                      href={mediaUrl}
                      className="mr-2 min-w-0 truncate text-lg font-bold text-white hover:underline xl:text-xl"
                    >
                      {title}
                    </Link>
                    {watch.mediaType === 'tv' && watch.seasonNumber !== undefined && (
                      <span className="text-sm text-gray-400">
                        {intl.formatMessage(messages.season, {
                          season: watch.seasonNumber,
                        })}
                        {watch.episodeNumber !== undefined &&
                          ` ${intl.formatMessage(messages.episode, {
                            episode: watch.episodeNumber,
                          })}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-0">
                  <div className="card-field">
                    <span className="card-field-name">
                      {intl.formatMessage(messages.watched)}
                    </span>
                    <span className="flex truncate text-sm text-gray-300">
                      <FormattedRelativeTime
                        value={relativeTime}
                        updateIntervalInSeconds={60}
                        numeric="auto"
                      />
                    </span>
                  </div>
                  {watchCount > 1 && (
                    <div className="card-field">
                      <Badge badgeType="warning">
                        {intl.formatMessage(messages.rewatch, {
                          count: watchCount,
                        })}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          const review = activity.data as Review;
          const mediaUrl = review.media
            ? `/${review.media.mediaType === 'movie' ? 'movie' : 'tv'}/${review.media.tmdbId}`
            : '#';
          const title =
            review.media?.title || `Media #${review.media?.tmdbId}`;
          const relativeTime = Math.floor(
            (activity.timestamp.getTime() - Date.now()) / 1000
          );

          return (
            <div
              key={`review-${review.id}-${index}`}
              className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-4 text-gray-400 shadow-md ring-1 ring-gray-700 xl:h-28 xl:flex-row"
            >
              {/* Backdrop Image */}
              {review.media?.backdropPath && (
                <div className="absolute inset-0 z-0 w-full overflow-hidden bg-cover bg-center xl:w-2/3">
                  <CachedImage
                    type="tmdb"
                    src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${review.media.backdropPath}`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fill
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, rgba(31, 41, 55, 0.47) 0%, rgba(31, 41, 55, 1) 100%)',
                    }}
                  />
                </div>
              )}
              <div className="relative flex w-full flex-col justify-between overflow-hidden sm:flex-row">
                <div className="relative z-10 flex w-full items-center overflow-hidden pl-4 pr-4 sm:pr-0 xl:w-7/12 2xl:w-2/3">
                  <Link
                    href={mediaUrl}
                    className="relative h-auto w-12 flex-shrink-0 scale-100 transform-gpu overflow-hidden rounded-md transition duration-300 hover:scale-105"
                  >
                    <CachedImage
                      type="tmdb"
                      src={
                        review.media?.posterPath
                          ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${review.media.posterPath}`
                          : '/images/seerr_poster_not_found.png'
                      }
                      alt=""
                      sizes="100vw"
                      style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'cover',
                      }}
                      width={600}
                      height={900}
                    />
                  </Link>
                  <div className="flex flex-col justify-center overflow-hidden pl-2 xl:pl-4">
                    <div className="pt-0.5 text-xs font-medium text-white sm:pt-1">
                      {intl.formatMessage(messages.reviewed)}
                    </div>
                    <Link
                      href={mediaUrl}
                      className="mr-2 min-w-0 truncate text-lg font-bold text-white hover:underline xl:text-xl"
                    >
                      {title}
                    </Link>
                  </div>
                </div>
                <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-0">
                  <div className="card-field">
                    <span className="card-field-name">
                      {intl.formatMessage(messages.reviewed)}
                    </span>
                    <span className="flex truncate text-sm text-gray-300">
                      <FormattedRelativeTime
                        value={relativeTime}
                        updateIntervalInSeconds={60}
                        numeric="auto"
                      />
                    </span>
                  </div>
                  {review.rating && (
                    <div className="card-field">
                      <span className="card-field-name">
                        {intl.formatMessage(messages.rating)}
                      </span>
                      <span className="flex items-center text-sm text-yellow-500">
                        <StarIcon className="mr-1 h-4 w-4" />
                        {review.rating}/10
                      </span>
                    </div>
                  )}
                  {review.content && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-400 italic">
                      &ldquo;{review.content}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default RecentActivityFeed;
