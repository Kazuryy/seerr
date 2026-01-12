import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { WatchHistoryResponse } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { FilmIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity', {
  watchedOn: 'Watched on {date}',
  noWatchHistory: 'No watch history yet',
  season: 'S{season}',
  episode: 'E{episode}',
});

interface WatchHistoryListProps {
  data?: WatchHistoryResponse;
  isLoading: boolean;
}

const WatchHistoryList = ({ data, isLoading }: WatchHistoryListProps) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FilmIcon className="mb-4 h-16 w-16" />
        <p>{intl.formatMessage(messages.noWatchHistory)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.results.map((watch) => (
        <div
          key={watch.id}
          className="hover:bg-gray-750 flex items-center space-x-4 rounded-lg bg-gray-800 p-4 transition-colors"
        >
          <div className="flex-1">
            <Link
              href={`/${watch.mediaType === 'movie' ? 'movie' : 'tv'}/${
                watch.media?.tmdbId
              }`}
              className="text-lg font-medium text-white hover:text-indigo-400"
            >
              {watch.mediaType === 'movie' ? 'Movie' : 'TV Show'} #
              {watch.media?.tmdbId}
            </Link>
            {watch.seasonNumber !== undefined && (
              <p className="text-sm text-gray-400">
                {intl.formatMessage(messages.season, {
                  season: watch.seasonNumber,
                })}{' '}
                {watch.episodeNumber !== undefined &&
                  intl.formatMessage(messages.episode, {
                    episode: watch.episodeNumber,
                  })}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {intl.formatMessage(messages.watchedOn, {
                date: new Date(watch.watchedAt).toLocaleDateString(
                  intl.locale,
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                ),
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WatchHistoryList;
