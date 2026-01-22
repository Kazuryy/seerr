import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { ReviewButton } from '@app/components/TrackingButtons';
import { useMediaActivity } from '@app/hooks/useMediaActivity';
import { useSeriesProgress } from '@app/hooks/useSeriesProgress';
import type { MediaType } from '@app/hooks/useWatchHistory';
import defineMessages from '@app/utils/defineMessages';
import { EyeIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.MediaDetails.MediaActivitySection',
  {
    yourActivity: 'Your Activity',
    watched: 'Watched {count}x',
    watching: 'Watching',
    notWatched: 'Not watched',
  }
);

interface MediaActivitySectionProps {
  tmdbId: number;
  mediaType: MediaType;
  mediaId?: number; // Internal media ID for series completion count
  onUpdate?: () => void;
}

const MediaActivitySection = ({
  tmdbId,
  mediaType,
  mediaId,
  onUpdate,
}: MediaActivitySectionProps) => {
  const intl = useIntl();
  const {
    data: activity,
    isLoading,
    mutate,
  } = useMediaActivity({
    mediaId: tmdbId,
    mediaType,
  });

  // Get series progress for completion count (TV only)
  const { data: seriesProgress } = useSeriesProgress(
    mediaType === 'tv' ? mediaId : undefined
  );

  const handleReviewUpdate = () => {
    mutate();
    onUpdate?.();
  };

  if (isLoading) {
    return (
      <div className="flex h-28 w-52 items-center justify-center rounded-lg border border-gray-700 bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  const hasActivity = activity && activity.watchCount > 0;

  return (
    <div className="flex w-52 flex-col rounded-lg border border-gray-700 bg-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <EyeIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {intl.formatMessage(messages.yourActivity)}
          </span>
        </div>
        <ReviewButton
          tmdbId={tmdbId}
          mediaType={mediaType}
          onUpdate={handleReviewUpdate}
          compact
        />
      </div>

      {hasActivity ? (
        <div className="mt-3 flex flex-col gap-2">
          {/* Watch count - for TV use completionCount, for movies use watchCount */}
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-base font-medium">
              {mediaType === 'tv'
                ? seriesProgress?.completionCount
                  ? intl.formatMessage(messages.watched, {
                      count: seriesProgress.completionCount,
                    })
                  : intl.formatMessage(messages.watching)
                : intl.formatMessage(messages.watched, {
                    count: activity.watchCount,
                  })}
            </span>
          </div>

          {/* User rating */}
          {activity.userReview?.rating && (
            <div className="flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-yellow-400" />
              <span className="text-base font-bold text-white">
                {activity.userReview.rating}/10
              </span>
            </div>
          )}
        </div>
      ) : (
        <span className="mt-3 text-base text-gray-500">
          {intl.formatMessage(messages.notWatched)}
        </span>
      )}
    </div>
  );
};

export default MediaActivitySection;
