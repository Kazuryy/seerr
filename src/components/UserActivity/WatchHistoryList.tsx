import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { WatchHistoryResponse } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { FilmIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import ActivityItem from './ActivityItem';

const messages = defineMessages('components.UserActivity', {
  noWatchHistory: 'No watch history yet',
});

interface WatchHistoryListProps {
  data?: WatchHistoryResponse;
  isLoading: boolean;
}

const WatchHistoryList = ({ data, isLoading }: WatchHistoryListProps) => {
  const intl = useIntl();

  // Calculate watch counts per media
  const watchCounts = useMemo(() => {
    if (!data) return new Map<string, number>();

    const counts = new Map<string, number>();

    // Count watches per media (grouped by mediaId, seasonNumber, episodeNumber for TV shows)
    data.results.forEach((watch) => {
      const key = `${watch.mediaId}-${watch.seasonNumber ?? ''}-${
        watch.episodeNumber ?? ''
      }`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [data]);

  // Get watch count for a specific entry
  const getWatchCount = (watch: WatchHistoryResponse['results'][0]): number => {
    const key = `${watch.mediaId}-${watch.seasonNumber ?? ''}-${
      watch.episodeNumber ?? ''
    }`;
    return watchCounts.get(key) || 1;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-24 text-white">
        <FilmIcon className="mb-4 h-16 w-16 text-gray-400" />
        <span className="text-2xl text-gray-400">
          {intl.formatMessage(messages.noWatchHistory)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.results.map((watch) => {
        const watchCount = getWatchCount(watch);
        return (
          <ActivityItem
            key={watch.id}
            type="watch"
            media={
              watch.media
                ? {
                    id: watch.media.id,
                    tmdbId: watch.media.tmdbId,
                    mediaType: watch.media.mediaType as 'movie' | 'tv',
                    title: watch.media.title,
                    posterPath: watch.media.posterPath,
                    backdropPath: watch.media.backdropPath,
                  }
                : undefined
            }
            timestamp={new Date(watch.watchedAt)}
            seasonNumber={watch.seasonNumber}
            episodeNumber={watch.episodeNumber}
            watchCount={watchCount}
          />
        );
      })}
    </div>
  );
};

export default WatchHistoryList;
