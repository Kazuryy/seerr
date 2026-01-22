import Alert from '@app/components/Common/Alert';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useCommunityFeed } from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import ReviewCard from './ReviewCard';

const messages = defineMessages('components.Community.CommunityFeed', {
  allMedia: 'All',
  movies: 'Movies',
  tvShows: 'Series',
  latest: 'Latest',
  top: 'Top',
  noReviews: 'No reviews yet',
  noReviewsDescription:
    'Be the first to share your thoughts with the community!',
});

const CommunityFeed = () => {
  const intl = useIntl();
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [sort, setSort] = useState<'latest' | 'top'>('latest');

  const { data, isLoading, error } = useCommunityFeed({
    mediaType,
    sort,
    limit: 20,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load community feed
      </Alert>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 sm:mb-6 sm:gap-4">
        {/* Media Type Filter */}
        <div className="flex flex-wrap gap-2 sm:space-x-2">
          <button
            onClick={() => setMediaType('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              mediaType === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.allMedia)}
          </button>
          <button
            onClick={() => setMediaType('movie')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              mediaType === 'movie'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.movies)}
          </button>
          <button
            onClick={() => setMediaType('tv')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              mediaType === 'tv'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.tvShows)}
          </button>
        </div>

        {/* Sort Filter */}
        <div className="flex flex-wrap gap-2 sm:space-x-2">
          <button
            onClick={() => setSort('latest')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              sort === 'latest'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.latest)}
          </button>
          <button
            onClick={() => setSort('top')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
              sort === 'top'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {intl.formatMessage(messages.top)}
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {data && data.reviews.length > 0 ? (
        <div className="space-y-4">
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16 px-4">
          <p className="mb-2 text-xl font-semibold text-white">
            {intl.formatMessage(messages.noReviews)}
          </p>
          <p className="text-gray-400">
            {intl.formatMessage(messages.noReviewsDescription)}
          </p>
        </div>
      )}
    </div>
  );
};

export default CommunityFeed;
