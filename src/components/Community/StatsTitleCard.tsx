import TmdbTitleCard from '@app/components/TitleCard/TmdbTitleCard';
import { EyeIcon, StarIcon } from '@heroicons/react/24/outline';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Community.StatsTitleCard', {
  watches: '{count} watches',
  reviews: '{count} reviews',
  avgRating: 'Avg: {rating}/10',
});

interface StatsTitleCardProps {
  id: number;
  tmdbId: number;
  type: 'movie' | 'tv';
  watchCount?: number;
  averageRating?: number;
  reviewCount?: number;
}

const StatsTitleCard = ({
  id,
  tmdbId,
  type,
  watchCount,
  averageRating,
  reviewCount,
}: StatsTitleCardProps) => {
  const intl = useIntl();

  return (
    <div className="w-36 sm:w-44 md:w-52">
      <TmdbTitleCard id={id} tmdbId={tmdbId} type={type} canExpand />
      {(watchCount !== undefined || averageRating !== undefined) && (
        <div className="mt-2">
          {watchCount !== undefined && (
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-400">
              <EyeIcon className="h-3.5 w-3.5" />
              <span>
                {intl.formatMessage(messages.watches, {
                  count: watchCount,
                })}
              </span>
            </div>
          )}
          {averageRating !== undefined && reviewCount !== undefined && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-center space-x-1 text-xs text-yellow-500">
                <StarIcon className="h-3.5 w-3.5" />
                <span>
                  {intl.formatMessage(messages.avgRating, {
                    rating: averageRating.toFixed(1),
                  })}
                </span>
              </div>
              <div className="text-center text-xs text-gray-400">
                {intl.formatMessage(messages.reviews, {
                  count: reviewCount,
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsTitleCard;
