import Tooltip from '@app/components/Common/Tooltip';
import { useMarkAsWatched } from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import type { MediaType } from '@server/models/Search';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import { mutate } from 'swr';

interface MarkAsWatchedButtonProps {
  mediaId: number;
  mediaType: MediaType;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  isWatched?: boolean;
  watchId?: number;
  onUpdate?: () => void;
}

const messages = defineMessages('components.TrackingButtons', {
  markAsWatched: 'Mark as watched',
  markAsUnwatched: 'Remove from watch history',
  watchedSuccess: '<strong>{title}</strong> marked as watched!',
  unwatchedSuccess: '<strong>{title}</strong> removed from watch history.',
  error: 'Something went wrong. Please try again.',
});

const MarkAsWatchedButton = ({
  mediaId,
  mediaType,
  title = 'this item',
  seasonNumber,
  episodeNumber,
  isWatched = false,
  watchId,
  onUpdate,
}: MarkAsWatchedButtonProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { user } = useUser();
  const { markAsWatched, deleteWatchEntry, isLoading } = useMarkAsWatched();

  if (!user) {
    return null;
  }

  const handleToggleWatched = async () => {
    try {
      if (isWatched && watchId) {
        // Remove from watch history
        await deleteWatchEntry(watchId);

        addToast(
          <span>
            {intl.formatMessage(messages.unwatchedSuccess, {
              title,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      } else {
        // Mark as watched
        await markAsWatched({
          mediaId,
          mediaType: mediaType === 'movie' ? 'movie' : 'tv',
          seasonNumber,
          episodeNumber,
        });

        addToast(
          <span>
            {intl.formatMessage(messages.watchedSuccess, {
              title,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }

      // Revalidate relevant data
      mutate(`/api/v1/tracking/watch/${mediaId}`);
      mutate('/api/v1/tracking/watch');

      // Call parent update callback if provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  };

  return (
    <Tooltip
      content={intl.formatMessage(
        isWatched ? messages.markAsUnwatched : messages.markAsWatched
      )}
    >
      <button
        onClick={handleToggleWatched}
        disabled={isLoading}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={intl.formatMessage(
          isWatched ? messages.markAsUnwatched : messages.markAsWatched
        )}
      >
        {isWatched ? (
          <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
        ) : (
          <CheckCircleIcon className="h-5 w-5" />
        )}
      </button>
    </Tooltip>
  );
};

export default MarkAsWatchedButton;
