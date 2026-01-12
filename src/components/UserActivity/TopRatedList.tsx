import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { TopRatedItem } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { FilmIcon, StarIcon, TvIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity.TopRatedList', {
  noTopRated: 'No rated items yet',
  startRating: 'Rate some movies and shows to see your top picks here!',
  watchedTimes: '{count, plural, one {watched # time} other {watched # times}}',
});

interface TopRatedListProps {
  data?: TopRatedItem[];
  isLoading: boolean;
  limit?: number;
}

const TopRatedList = ({
  data = [],
  isLoading,
  limit = 5,
}: TopRatedListProps) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <StarIcon className="mb-2 h-12 w-12" />
        <p className="mb-2 text-sm font-medium">
          {intl.formatMessage(messages.noTopRated)}
        </p>
        <p className="text-xs text-gray-500">
          {intl.formatMessage(messages.startRating)}
        </p>
      </div>
    );
  }

  const topRated = data.slice(0, limit);

  return (
    <div className="space-y-3">
      {topRated.map((item, index) => (
        <div
          key={`top-rated-${item.id}`}
          className="flex items-center space-x-4 rounded-lg border border-gray-700 bg-gray-800 p-4"
        >
          {/* Rank Number */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {index + 1}
          </div>

          {/* Media Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <Link
                href={`/${item.mediaType === 'movie' ? 'movie' : 'tv'}/${
                  item.media?.tmdbId
                }`}
                className="truncate font-medium text-white hover:text-indigo-400"
              >
                {item.media?.title || `Media #${item.media?.tmdbId}`}
              </Link>
              {item.mediaType === 'movie' ? (
                <FilmIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              ) : (
                <TvIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              )}
            </div>
            {item.watchCount > 1 && (
              <p className="mt-1 text-xs text-gray-500">
                {intl.formatMessage(messages.watchedTimes, {
                  count: item.watchCount,
                })}
              </p>
            )}
          </div>

          {/* Rating */}
          <div className="flex flex-shrink-0 items-center space-x-1">
            <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-bold text-white">
              {item.rating}/10
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopRatedList;
