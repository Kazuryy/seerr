import TmdbTitleCard from '@app/components/TitleCard/TmdbTitleCard';
import {
  toggleReviewLike,
  type CommunityFeedReview,
} from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftIcon,
  HeartIcon as HeartIconOutline,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import ReviewComments from './ReviewComments';

const messages = defineMessages('components.Community.ReviewCard', {
  spoilerWarning: 'Contains Spoilers',
  showSpoilers: 'Show Spoilers',
  hideSpoilers: 'Hide Spoilers',
  viewComments: 'View Comments',
  hideComments: 'Hide Comments',
  ratedOutOf10: 'Rated {rating}/10',
});

interface ReviewCardProps {
  review: CommunityFeedReview;
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  const intl = useIntl();
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(review.isLikedByMe);
  const [likesCount, setLikesCount] = useState(review.likesCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleToggleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    try {
      const result = await toggleReviewLike(review.id, liked);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (error) {
      // Silent error - user will see like didn't work
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Link href={`/users/${review.user?.id}`} className="flex-shrink-0">
            <img
              src={
                review.user?.avatar
                  ? `/api/v1${review.user.avatar}`
                  : '/avatars/default.png'
              }
              alt={review.user?.displayName}
              className="h-10 w-10 rounded-full"
            />
          </Link>
          <div>
            <Link
              href={`/users/${review.user?.id}`}
              className="font-semibold text-white hover:text-indigo-400"
            >
              {review.user?.displayName}
            </Link>
            <p className="text-sm text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {review.rating && (
          <div className="flex items-center space-x-1 rounded-md bg-indigo-600 px-3 py-1">
            <span className="text-lg font-bold text-white">
              {review.rating}
            </span>
            <span className="text-sm text-indigo-200">/10</span>
          </div>
        )}
      </div>

      {/* Media Card */}
      {review.media && (
        <div className="mb-4">
          <TmdbTitleCard
            id={review.media.tmdbId}
            tmdbId={review.media.tmdbId}
            type={review.mediaType}
          />
        </div>
      )}

      {/* Review Content */}
      {review.content && (
        <div className="mb-4">
          {review.containsSpoilers && !showSpoilers ? (
            <div className="rounded-md border border-yellow-500 bg-yellow-500 bg-opacity-10 p-4">
              <p className="mb-2 font-semibold text-yellow-500">
                {intl.formatMessage(messages.spoilerWarning)}
              </p>
              <button
                onClick={() => setShowSpoilers(true)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                {intl.formatMessage(messages.showSpoilers)}
              </button>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-gray-300">
                {review.content}
              </p>
              {review.containsSpoilers && (
                <button
                  onClick={() => setShowSpoilers(false)}
                  className="mt-2 text-sm text-gray-400 hover:text-gray-300"
                >
                  {intl.formatMessage(messages.hideSpoilers)}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-4 border-t border-gray-700 pt-4">
        {/* Like Button */}
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`flex items-center space-x-2 rounded-md px-3 py-2 transition-colors ${
            liked
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {liked ? (
            <HeartIconSolid className="h-5 w-5" />
          ) : (
            <HeartIconOutline className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{likesCount}</span>
        </button>

        {/* Comments Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 rounded-md bg-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-600"
        >
          <ChatBubbleLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">{review.commentsCount}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <ReviewComments reviewId={review.id} />
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
