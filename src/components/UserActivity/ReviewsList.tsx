import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { ReviewsResponse } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity', {
  reviewedOn: 'Reviewed on {date}',
  noReviews: 'No reviews yet',
  rating: 'Rating: {rating}/10',
  containsSpoilers: 'Contains Spoilers',
  showSpoilers: 'Show Spoilers',
  hideSpoilers: 'Hide Spoilers',
  private: 'Private',
});

interface ReviewsListProps {
  data?: ReviewsResponse;
  isLoading: boolean;
}

const ReviewsList = ({ data, isLoading }: ReviewsListProps) => {
  const intl = useIntl();
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(
    new Set()
  );

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
        <ChatBubbleLeftIcon className="mb-4 h-16 w-16" />
        <p>{intl.formatMessage(messages.noReviews)}</p>
      </div>
    );
  }

  const toggleSpoiler = (reviewId: number) => {
    setRevealedSpoilers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {data.results.map((review) => (
        <div
          key={review.id}
          className="hover:bg-gray-750 rounded-lg bg-gray-800 p-6 transition-colors"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <Link
                href={`/${review.mediaType === 'movie' ? 'movie' : 'tv'}/${
                  review.media?.tmdbId
                }`}
                className="text-lg font-medium text-white hover:text-indigo-400"
              >
                {review.mediaType === 'movie' ? 'Movie' : 'TV Show'} #
                {review.media?.tmdbId}
              </Link>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
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
                {!review.isPublic && (
                  <span className="rounded bg-gray-700 px-2 py-0.5 text-xs">
                    {intl.formatMessage(messages.private)}
                  </span>
                )}
              </div>
            </div>
            {review.rating && (
              <div className="flex items-center space-x-1 rounded bg-yellow-500 bg-opacity-20 px-3 py-1">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-yellow-500">
                  {review.rating}
                </span>
                <span className="text-sm text-gray-400">/10</span>
              </div>
            )}
          </div>

          {review.content && (
            <div className="mt-4">
              {review.containsSpoilers && !revealedSpoilers.has(review.id) ? (
                <div className="relative">
                  <div className="select-none blur-sm">
                    <p className="text-gray-300">{review.content}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => toggleSpoiler(review.id)}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      ⚠️ {intl.formatMessage(messages.showSpoilers)}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-300">{review.content}</p>
                  {review.containsSpoilers && (
                    <button
                      onClick={() => toggleSpoiler(review.id)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-400"
                    >
                      {intl.formatMessage(messages.hideSpoilers)}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewsList;
