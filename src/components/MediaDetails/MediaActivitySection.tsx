import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import {
  MarkAsWatchedButton,
  ReviewButton,
} from '@app/components/TrackingButtons';
import { useMediaActivity } from '@app/hooks/useMediaActivity';
import type { MediaType } from '@app/hooks/useWatchHistory';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftIcon,
  EyeIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.MediaDetails.MediaActivitySection',
  {
    yourActivity: 'Your Activity',
    watched: 'Watched {count, plural, one {# time} other {# times}}',
    lastWatched: 'Last: {date}',
    yourRating: 'Your rating: {rating}/10',
    private: 'Private',
    public: 'Public',
    containsSpoilers: 'Contains spoilers',
    editInMyActivity: 'Edit in My Activity',
    community: 'Community',
    averageRating: '{rating}/10',
    totalRatings: '{count, plural, one {# rating} other {# ratings}}',
    totalReviews: '{count, plural, one {# review} other {# reviews}}',
    viewCommunityReviews: 'View community reviews',
    notWatchedYet: 'Not watched yet',
    markAsWatched: 'Mark as Watched',
  }
);

interface MediaActivitySectionProps {
  tmdbId: number;
  mediaType: MediaType;
}

const MediaActivitySection = ({
  tmdbId,
  mediaType,
}: MediaActivitySectionProps) => {
  const intl = useIntl();
  const { data: activity, isLoading } = useMediaActivity({
    mediaId: tmdbId,
    mediaType,
  });

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const hasActivity = activity && activity.watchCount > 0;

  return (
    <div className="mt-8">
      <div className="rounded-lg border border-gray-700 bg-gray-800">
        {/* Your Activity */}
        <div className="border-b border-gray-700 p-6">
          <h3 className="mb-4 flex items-center text-lg font-bold text-white">
            <EyeIcon className="mr-2 h-5 w-5" />
            {intl.formatMessage(messages.yourActivity)}
          </h3>

          {hasActivity ? (
            <div className="space-y-3">
              {/* Watch count and last watched */}
              <div className="flex items-center text-sm text-gray-300">
                <span className="font-medium">
                  ✅{' '}
                  {intl.formatMessage(messages.watched, {
                    count: activity.watchCount,
                  })}
                </span>
                {activity.lastWatchedAt && (
                  <span className="ml-2 text-gray-400">
                    (
                    {intl.formatMessage(messages.lastWatched, {
                      date: new Date(activity.lastWatchedAt).toLocaleDateString(
                        intl.locale,
                        {
                          month: 'short',
                          day: 'numeric',
                        }
                      ),
                    })}
                    )
                  </span>
                )}
              </div>

              {/* User rating and review */}
              {activity.userReview && (
                <>
                  {activity.userReview.rating && (
                    <div className="flex items-center text-sm text-gray-300">
                      <StarIcon className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">
                        {intl.formatMessage(messages.yourRating, {
                          rating: activity.userReview.rating,
                        })}
                      </span>
                    </div>
                  )}

                  {activity.userReview.content && (
                    <div className="rounded-md bg-gray-900 p-3">
                      <div className="mb-1 flex items-center space-x-2 text-xs text-gray-400">
                        <ChatBubbleLeftIcon className="h-3 w-3" />
                        <span>
                          {activity.userReview.isPublic
                            ? intl.formatMessage(messages.public)
                            : intl.formatMessage(messages.private)}
                        </span>
                        {activity.userReview.containsSpoilers && (
                          <span>
                            • {intl.formatMessage(messages.containsSpoilers)}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-gray-300">
                        "{activity.userReview.content}"
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <MarkAsWatchedButton mediaId={tmdbId} mediaType={mediaType} />
                <ReviewButton mediaId={tmdbId} mediaType={mediaType} />
                <Link
                  href="/activity?tab=watch"
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {intl.formatMessage(messages.editInMyActivity)} →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                {intl.formatMessage(messages.notWatchedYet)}
              </p>
              <div className="flex space-x-2">
                <MarkAsWatchedButton mediaId={tmdbId} mediaType={mediaType} />
                <ReviewButton mediaId={tmdbId} mediaType={mediaType} />
              </div>
            </div>
          )}
        </div>

        {/* Community Stats */}
        {activity?.communityStats &&
          (activity.communityStats.totalRatings > 0 ||
            activity.communityStats.totalReviews > 0) && (
            <div className="p-6">
              <h3 className="mb-4 flex items-center text-lg font-bold text-white">
                <StarIcon className="mr-2 h-5 w-5" />
                {intl.formatMessage(messages.community)}
              </h3>

              <div className="space-y-2">
                {activity.communityStats.averageRating !== undefined && (
                  <div className="flex items-center text-sm text-gray-300">
                    <StarIcon className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {intl.formatMessage(messages.averageRating, {
                        rating:
                          activity.communityStats.averageRating.toFixed(1),
                      })}
                    </span>
                    <span className="ml-2 text-gray-400">
                      (
                      {intl.formatMessage(messages.totalRatings, {
                        count: activity.communityStats.totalRatings,
                      })}
                      )
                    </span>
                  </div>
                )}

                {activity.communityStats.totalReviews > 0 && (
                  <div className="flex items-center text-sm text-gray-300">
                    <ChatBubbleLeftIcon className="mr-1 h-4 w-4" />
                    <span>
                      {intl.formatMessage(messages.totalReviews, {
                        count: activity.communityStats.totalReviews,
                      })}
                    </span>
                  </div>
                )}

                <Link
                  href={`/reviews?mediaId=${tmdbId}&mediaType=${mediaType}`}
                  className="inline-block pt-2 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {intl.formatMessage(messages.viewCommunityReviews)} →
                </Link>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default MediaActivitySection;
