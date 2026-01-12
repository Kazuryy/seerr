import type { Review } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.CommunityReviews', {
  reviewedOn: 'Reviewed on {date}',
  containsSpoilers: 'Contains Spoilers',
  showSpoilers: 'Show Spoilers',
  hideSpoilers: 'Hide Spoilers',
  by: 'by',
});

interface ReviewCardProps {
  review: Review;
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  const intl = useIntl();
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  return (
    <div className="hover:bg-gray-750 rounded-lg bg-gray-800 p-6 transition-colors">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <Link
              href={`/${review.mediaType === 'movie' ? 'movie' : 'tv'}/${
                review.media?.tmdbId
              }`}
              className="text-lg font-bold text-white hover:text-indigo-400"
            >
              {review.mediaType === 'movie' ? 'Movie' : 'TV Show'} #
              {review.media?.tmdbId}
            </Link>
            {review.containsSpoilers && (
              <span className="flex items-center space-x-1 rounded bg-red-900 bg-opacity-50 px-2 py-0.5 text-xs text-red-300">
                <ExclamationTriangleIcon className="h-3 w-3" />
                <span>{intl.formatMessage(messages.containsSpoilers)}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
            {review.user && (
              <>
                <span>{intl.formatMessage(messages.by)}</span>
                <span className="font-medium text-gray-300">
                  {review.user.displayName}
                </span>
                <span>•</span>
              </>
            )}
            <span>
              {intl.formatMessage(messages.reviewedOn, {
                date: new Date(review.createdAt).toLocaleDateString(
                  intl.locale,
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }
                ),
              })}
            </span>
          </div>
        </div>

        {/* Rating Badge */}
        {review.rating && (
          <div className="ml-4 flex items-center space-x-1 rounded-lg bg-yellow-500 bg-opacity-20 px-3 py-2">
            <StarIcon className="h-6 w-6 text-yellow-500" />
            <span className="text-xl font-bold text-yellow-500">
              {review.rating}
            </span>
            <span className="text-sm text-gray-400">/10</span>
          </div>
        )}
      </div>

      {/* Review Content */}
      {review.content && (
        <div className="mt-4">
          {review.containsSpoilers && !spoilerRevealed ? (
            <div className="relative rounded-lg border-2 border-red-900 bg-gray-900 p-6">
              <div className="select-none blur-md">
                <p className="text-gray-300">{review.content}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setSpoilerRevealed(true)}
                  className="flex items-center space-x-2 rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-red-700"
                >
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>{intl.formatMessage(messages.showSpoilers)}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-gray-300">
                {review.content}
              </p>
              {review.containsSpoilers && (
                <button
                  onClick={() => setSpoilerRevealed(false)}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-400"
                >
                  {intl.formatMessage(messages.hideSpoilers)}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
