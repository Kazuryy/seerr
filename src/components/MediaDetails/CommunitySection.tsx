import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { MediaType } from '@app/hooks/useTracking';
import { useReviews } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftIcon, StarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.MediaDetails.CommunitySection', {
  communityTitle: 'Community',
  averageRating: 'Average Rating',
  reviews: '{count, plural, =0 {No reviews} one {# review} other {# reviews}}',
  viewAllReviews: 'View all reviews',
  noRatingsYet: 'No ratings yet',
  beTheFirst: 'Be the first to rate this!',
});

interface CommunitySectionProps {
  mediaId: number;
  mediaType: MediaType;
}

const CommunitySection = ({ mediaId, mediaType }: CommunitySectionProps) => {
  const intl = useIntl();

  const { data, isLoading } = useReviews({
    mediaId,
    mediaType,
    isPublic: true,
    take: 100, // Fetch enough to calculate accurate average
  });

  const stats = useMemo(() => {
    if (!data || !data.results.length) {
      return { averageRating: 0, totalReviews: 0, hasRatings: false };
    }

    const reviewsWithRating = data.results.filter((r) => r.rating !== null);
    const totalReviews = data.pageInfo.results;

    if (reviewsWithRating.length === 0) {
      return { averageRating: 0, totalReviews, hasRatings: false };
    }

    const sum = reviewsWithRating.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    const averageRating = sum / reviewsWithRating.length;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      hasRatings: true,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="mt-8 rounded-lg bg-gray-800 p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <h3 className="mb-4 flex items-center text-xl font-bold text-white">
        <ChatBubbleLeftIcon className="mr-2 h-6 w-6" />
        {intl.formatMessage(messages.communityTitle)}
      </h3>

      <div className="space-y-4">
        {/* Average Rating */}
        {stats.hasRatings ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <StarIcon className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              <span className="text-3xl font-bold text-white">
                {stats.averageRating}
              </span>
              <span className="text-lg text-gray-400">/10</span>
            </div>
            <div className="text-sm text-gray-400">
              {intl.formatMessage(messages.averageRating)}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 text-gray-400">
            <StarIcon className="h-8 w-8" />
            <div>
              <p className="text-sm font-medium">
                {intl.formatMessage(messages.noRatingsYet)}
              </p>
              <p className="text-xs">
                {intl.formatMessage(messages.beTheFirst)}
              </p>
            </div>
          </div>
        )}

        {/* Review Count */}
        <div className="flex items-center justify-between border-t border-gray-700 pt-4">
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
            <span className="text-gray-300">
              {intl.formatMessage(messages.reviews, {
                count: stats.totalReviews,
              })}
            </span>
          </div>

          {stats.totalReviews > 0 && (
            <Link
              href={`/reviews?mediaId=${mediaId}&mediaType=${mediaType}`}
              className="text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              {intl.formatMessage(messages.viewAllReviews)} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunitySection;
