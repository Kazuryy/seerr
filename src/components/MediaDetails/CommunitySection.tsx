import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import type { MediaType } from '@app/hooks/useTracking';
import { useReviews } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.MediaDetails.CommunitySection', {
  communityTitle: 'Community',
  reviews: '{count} review{count, plural, one {} other {s}}',
  noReviews: 'No reviews yet',
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
    take: 100,
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
      <div className="flex h-28 w-48 items-center justify-center rounded-lg border border-gray-700 bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex w-48 flex-col rounded-lg border border-gray-700 bg-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-400">
        <ChatBubbleLeftIcon className="h-5 w-5" />
        <span className="text-sm font-medium">
          {intl.formatMessage(messages.communityTitle)}
        </span>
      </div>

      {/* Rating */}
      <div className="mt-3 flex items-center gap-2">
        {stats.hasRatings ? (
          <>
            <StarIcon className="h-6 w-6 text-yellow-400" />
            <span className="text-2xl font-bold text-white">
              {stats.averageRating}
              <span className="text-base font-normal text-gray-400">/10</span>
            </span>
          </>
        ) : (
          <span className="text-base text-gray-500">—</span>
        )}
      </div>

      {/* Review count */}
      <span className="mt-2 text-sm text-gray-500">
        {stats.totalReviews > 0
          ? intl.formatMessage(messages.reviews, { count: stats.totalReviews })
          : intl.formatMessage(messages.noReviews)}
      </span>
    </div>
  );
};

export default CommunitySection;
