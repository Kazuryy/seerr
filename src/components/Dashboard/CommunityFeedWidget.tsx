import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Modal from '@app/components/Common/Modal';
import ReviewCard from '@app/components/Community/ReviewCard';
import {
  useCommunityFeed,
  type CommunityFeedReview,
} from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.CommunityFeedWidget', {
  recentReviews: 'Recent Reviews',
  viewAll: 'View All',
  noReviews: 'No reviews yet',
  beTheFirst: 'Be the first to share your thoughts!',
});

const CommunityFeedWidget = () => {
  const intl = useIntl();
  const { data, isLoading } = useCommunityFeed({
    mediaType: 'all',
    sort: 'latest',
    limit: 5,
  });
  const [expandedReview, setExpandedReview] =
    useState<CommunityFeedReview | null>(null);

  return (
    <>
      {/* Review Modal */}
      <Modal
        show={!!expandedReview}
        onCancel={() => setExpandedReview(null)}
      >
        {expandedReview && <ReviewCard review={expandedReview} />}
      </Modal>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="mr-2 h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-white">
              {intl.formatMessage(messages.recentReviews)}
            </h3>
          </div>
          <Link
            href="/community"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {intl.formatMessage(messages.viewAll)} →
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.reviews.length > 0 ? (
          <div className="space-y-3">
            {data.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                compact
                onExpand={setExpandedReview}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">
              {intl.formatMessage(messages.noReviews)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {intl.formatMessage(messages.beTheFirst)}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CommunityFeedWidget;
