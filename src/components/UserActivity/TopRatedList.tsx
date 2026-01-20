import CachedImage from '@app/components/Common/CachedImage';
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

// Get medal color based on rank
const getMedalStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-yellow-500/30';
    case 2:
      return 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-gray-400/30';
    case 3:
      return 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100 shadow-amber-600/30';
    default:
      return 'bg-gray-700 text-gray-300';
  }
};

// Get rating bar color
const getRatingColor = (rating: number) => {
  if (rating >= 9) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  if (rating >= 7) return 'bg-gradient-to-r from-green-500 to-green-400';
  if (rating >= 5) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
  return 'bg-gradient-to-r from-orange-500 to-orange-400';
};

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
  const maxRating = 10;

  return (
    <div className="space-y-2">
      {topRated.map((item, index) => {
        const rank = index + 1;
        const ratingPercent = ((item.rating || 0) / maxRating) * 100;

        return (
          <div
            key={`top-rated-${item.id}`}
            className="group relative flex items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-gray-600 hover:bg-gray-750"
          >
            {/* Rank Badge */}
            <div
              className={`flex h-full min-h-[4rem] w-12 flex-shrink-0 items-center justify-center ${getMedalStyle(rank)} shadow-lg`}
            >
              <span className="text-lg font-bold">{rank}</span>
            </div>

            {/* Poster */}
            <Link
              href={`/${item.mediaType === 'movie' ? 'movie' : 'tv'}/${item.media?.tmdbId}`}
              className="relative h-16 w-11 flex-shrink-0 overflow-hidden"
            >
              <CachedImage
                type="tmdb"
                src={
                  item.media?.posterPath
                    ? `https://image.tmdb.org/t/p/w92${item.media.posterPath}`
                    : '/images/seerr_poster_not_found.png'
                }
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fill
              />
            </Link>

            {/* Media Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/${item.mediaType === 'movie' ? 'movie' : 'tv'}/${item.media?.tmdbId}`}
                  className="truncate text-sm font-medium text-white group-hover:text-indigo-400"
                >
                  {item.media?.title || `Media #${item.media?.tmdbId}`}
                </Link>
                {item.mediaType === 'movie' ? (
                  <FilmIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                ) : (
                  <TvIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                )}
              </div>

              {/* Rating Bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className={`h-full rounded-full ${getRatingColor(item.rating || 0)} transition-all`}
                    style={{ width: `${ratingPercent}%` }}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">
                    {item.rating}
                  </span>
                </div>
              </div>

              {item.watchCount > 1 && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {intl.formatMessage(messages.watchedTimes, {
                    count: item.watchCount,
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopRatedList;
