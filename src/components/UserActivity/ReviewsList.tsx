import Badge from '@app/components/Common/Badge';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { ReviewsResponse } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity', {
  reviewed: 'Reviewed',
  noReviews: 'No reviews yet',
  rating: 'Rating',
  containsSpoilers: 'Spoilers',
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
    return <LoadingSpinner />;
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-24 text-white">
        <ChatBubbleLeftIcon className="mb-4 h-16 w-16 text-gray-400" />
        <span className="text-2xl text-gray-400">
          {intl.formatMessage(messages.noReviews)}
        </span>
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
    <div className="space-y-2">
      {data.results.map((review) => {
        const mediaUrl = review.media
          ? `/${review.media.mediaType === 'movie' ? 'movie' : 'tv'}/${review.media.tmdbId}`
          : '#';

        const title =
          review.media?.title ||
          `${review.media?.mediaType === 'movie' ? 'Movie' : 'TV Show'} #${review.media?.tmdbId}`;

        const relativeTime = Math.floor(
          (new Date(review.createdAt).getTime() - Date.now()) / 1000
        );

        return (
          <div
            key={review.id}
            className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-4 text-gray-400 shadow-md ring-1 ring-gray-700 xl:flex-row"
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
              {/* Poster and Title Section */}
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
                    style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
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
                  <div className="mt-1 flex flex-wrap gap-2">
                    {review.containsSpoilers && (
                      <Badge badgeType="danger">
                        {intl.formatMessage(messages.containsSpoilers)}
                      </Badge>
                    )}
                    {!review.isPublic && (
                      <Badge badgeType="default">
                        {intl.formatMessage(messages.private)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-0">
                {/* Timestamp */}
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

                {/* Rating */}
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
              </div>
            </div>

            {/* Review content on the right - always rendered for consistent layout */}
            <div className="z-10 mt-4 flex w-full flex-col justify-center pl-4 pr-4 xl:mt-0 xl:w-96 xl:pl-0">
              {review.content ? (
                review.containsSpoilers && !revealedSpoilers.has(review.id) ? (
                  <div className="relative">
                    <p className="line-clamp-3 select-none text-sm text-gray-300 italic blur-sm">
                      &ldquo;{review.content}&rdquo;
                    </p>
                    <button
                      onClick={() => toggleSpoiler(review.id)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      {intl.formatMessage(messages.showSpoilers)}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="line-clamp-3 text-sm text-gray-300 italic">
                      &ldquo;{review.content}&rdquo;
                    </p>
                    {review.containsSpoilers && (
                      <button
                        onClick={() => toggleSpoiler(review.id)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-400"
                      >
                        {intl.formatMessage(messages.hideSpoilers)}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <span className="text-sm text-gray-500 italic">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewsList;
