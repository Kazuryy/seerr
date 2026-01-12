import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import type { MediaType } from '@app/hooks/useTracking';
import { useReviews } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ChatBubbleLeftIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import ReviewCard from './ReviewCard';

const messages = defineMessages('components.CommunityReviews', {
  title: 'Community Reviews',
  description: 'See what the community is watching and reviewing',
  allMedia: 'All Media',
  movies: 'Movies',
  tvShows: 'TV Shows',
  publicOnly: 'Public Only',
  noReviews: 'No reviews yet',
  noReviewsDescription: 'Be the first to share your thoughts!',
  loadMore: 'Load More',
  loading: 'Loading reviews...',
});

const CommunityReviews = () => {
  const intl = useIntl();
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | MediaType>(
    'all'
  );
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useReviews({
    isPublic: true,
    mediaType: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  const hasMore = data && data.pageInfo.page < data.pageInfo.pages;

  return (
    <div className="px-4 py-6">
      <PageTitle title={intl.formatMessage(messages.title)} />

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="text-gray-400">
          {intl.formatMessage(messages.description)}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-gray-800 p-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Filter:</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setMediaTypeFilter('all');
              setPage(1);
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mediaTypeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.allMedia)}
          </button>
          <button
            onClick={() => {
              setMediaTypeFilter('movie');
              setPage(1);
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mediaTypeFilter === 'movie'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.movies)}
          </button>
          <button
            onClick={() => {
              setMediaTypeFilter('tv');
              setPage(1);
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mediaTypeFilter === 'tv'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.tvShows)}
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !data || data.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-gray-800 py-16 text-gray-400">
          <ChatBubbleLeftIcon className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">
            {intl.formatMessage(messages.noReviews)}
          </p>
          <p className="text-sm">
            {intl.formatMessage(messages.noReviewsDescription)}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {data.results.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage(page + 1)}
                disabled={isLoading}
                className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {intl.formatMessage(messages.loadMore)}
              </button>
            </div>
          )}

          {/* Page Info */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {data.results.length} of {data.pageInfo.results} reviews
            {data.pageInfo.pages > 1 &&
              ` (Page ${page} of ${data.pageInfo.pages})`}
          </div>
        </>
      )}
    </div>
  );
};

export default CommunityReviews;
