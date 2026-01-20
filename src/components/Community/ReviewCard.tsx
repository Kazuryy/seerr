import UserBadgeDisplay from '@app/components/Badges/UserBadgeDisplay';
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
  compact?: boolean;
  onExpand?: (review: CommunityFeedReview) => void;
}

const ReviewCard = ({ review, compact = false, onExpand }: ReviewCardProps) => {
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

  // Compact version for dashboard widget
  if (compact) {
    const handleClick = (e: React.MouseEvent) => {
      // Don't expand if clicking on a link
      if ((e.target as HTMLElement).closest('a')) return;
      onExpand?.(review);
    };

    return (
      <div
        className={`flex items-start space-x-3 rounded-md bg-gray-700/50 p-3 transition-colors hover:bg-gray-700 ${onExpand ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
        role={onExpand ? 'button' : undefined}
        tabIndex={onExpand ? 0 : undefined}
        onKeyDown={
          onExpand
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExpand(review);
                }
              }
            : undefined
        }
      >
        <Link href={`/users/${review.user?.id}`} className="flex-shrink-0">
          <img
            src={review.user?.avatar || '/avatars/default.png'}
            alt={review.user?.displayName}
            className="h-8 w-8 rounded-full"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <Link
              href={`/users/${review.user?.id}`}
              className="text-sm font-medium text-white hover:text-indigo-400"
            >
              {review.user?.displayName}
            </Link>
            {review.rating && (
              <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {review.rating}/10
              </span>
            )}
          </div>
          {review.media && (
            <Link
              href={`/${review.media.mediaType === 'movie' ? 'movie' : 'tv'}/${review.media.tmdbId}`}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {review.media.title || `${review.media.mediaType} #${review.media.tmdbId}`}
            </Link>
          )}
          {review.content && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
              {review.containsSpoilers ? '[Spoiler]' : review.content}
            </p>
          )}
          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
            <span className="flex items-center">
              <HeartIconOutline className="mr-1 h-3 w-3" />
              {likesCount}
            </span>
            <span className="flex items-center">
              <ChatBubbleLeftIcon className="mr-1 h-3 w-3" />
              {review.commentsCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link href={`/users/${review.user?.id}`} className="flex-shrink-0">
            <img
              src={review.user?.avatar || '/avatars/default.png'}
              alt={review.user?.displayName}
              className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
            />
          </Link>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Link
                href={`/users/${review.user?.id}`}
                className="text-sm font-semibold text-white hover:text-indigo-400 sm:text-base"
              >
                {review.user?.displayName}
              </Link>
              {review.user?.id && (
                <UserBadgeDisplay userId={review.user.id} limit={3} size="sm" />
              )}
            </div>
            <p className="text-xs text-gray-400 sm:text-sm">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {review.rating && (
          <div className="flex flex-shrink-0 items-center space-x-1 rounded-md bg-indigo-600 px-2 py-0.5 sm:px-3 sm:py-1">
            <span className="text-base font-bold text-white sm:text-lg">
              {review.rating}
            </span>
            <span className="text-xs text-indigo-200 sm:text-sm">/10</span>
          </div>
        )}
      </div>

      {/* Media Card */}
      {review.media && (
        <div className="mb-4">
          <TmdbTitleCard
            id={review.media.tmdbId}
            tmdbId={review.media.tmdbId}
            type={(review.media.mediaType || review.mediaType) as 'movie' | 'tv'}
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
      <div className="flex items-center space-x-2 border-t border-gray-700 pt-3 sm:space-x-4 sm:pt-4">
        {/* Like Button */}
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1.5 transition-colors sm:space-x-2 sm:px-3 sm:py-2 ${
            liked
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {liked ? (
            <HeartIconSolid className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <HeartIconOutline className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
          <span className="text-xs font-medium sm:text-sm">{likesCount}</span>
        </button>

        {/* Comments Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-1.5 rounded-md bg-gray-700 px-2.5 py-1.5 text-gray-300 hover:bg-gray-600 sm:space-x-2 sm:px-3 sm:py-2"
        >
          <ChatBubbleLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs font-medium sm:text-sm">{review.commentsCount}</span>
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
