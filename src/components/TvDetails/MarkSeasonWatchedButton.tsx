import Button from '@app/components/Common/Button';
import Tooltip from '@app/components/Common/Tooltip';
import useMarkSeasonWatched from '@app/hooks/useMarkSeasonWatched';
import defineMessages from '@app/utils/defineMessages';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages('components.TvDetails.MarkSeasonWatchedButton', {
  markAsWatched: 'Mark as Watched',
  unmarkSeason: 'Unmark Season',
  markedSuccess: 'Season {seasonNumber} marked as watched ({count} episodes)',
  unmarkedSuccess: 'Season {seasonNumber} unmarked ({count} entries removed)',
  alreadyWatched: 'Already fully watched',
  partiallyWatched: '{watched}/{total} watched',
});

interface MarkSeasonWatchedButtonProps {
  tmdbId: number;
  seasonNumber: number;
  onUpdate?: () => void;
}

const MarkSeasonWatchedButton = ({
  tmdbId,
  seasonNumber,
  onUpdate,
}: MarkSeasonWatchedButtonProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const {
    status,
    isLoading,
    isMarking,
    isUnmarking,
    markAsWatched,
    unmarkSeason,
  } = useMarkSeasonWatched(tmdbId, seasonNumber);

  const handleMarkAsWatched = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent Disclosure from toggling
    e.preventDefault();

    const result = await markAsWatched();
    if (result?.success) {
      addToast(
        intl.formatMessage(messages.markedSuccess, {
          seasonNumber,
          count: result.markedEpisodes,
        }),
        { appearance: 'success', autoDismiss: true }
      );
      onUpdate?.();
    }
  };

  const handleUnmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const success = await unmarkSeason();
    if (success) {
      addToast(
        intl.formatMessage(messages.unmarkedSuccess, {
          seasonNumber,
          count: status?.manualEpisodes || 0,
        }),
        { appearance: 'success', autoDismiss: true }
      );
      onUpdate?.();
    }
  };

  if (isLoading) {
    return null;
  }

  const isFullyWatched = status?.isComplete;
  const hasManualEntries = status?.hasManualEntries;

  // If fully watched and has manual entries, show unmark button
  if (isFullyWatched && hasManualEntries) {
    return (
      <Tooltip content={intl.formatMessage(messages.unmarkSeason)}>
        <Button
          buttonType="ghost"
          buttonSize="sm"
          onClick={handleUnmark}
          disabled={isUnmarking}
          className="flex items-center gap-1 text-green-400 hover:text-red-400"
        >
          <CheckCircleSolidIcon className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  }

  // If fully watched (no manual entries), just show checkmark
  if (isFullyWatched) {
    return (
      <Tooltip content={intl.formatMessage(messages.alreadyWatched)}>
        <div className="flex items-center text-green-400">
          <CheckCircleSolidIcon className="h-5 w-5" />
        </div>
      </Tooltip>
    );
  }

  // Show mark as watched button
  const tooltipContent =
    status && status.watchedEpisodes > 0
      ? intl.formatMessage(messages.partiallyWatched, {
          watched: status.watchedEpisodes,
          total: status.totalEpisodes,
        })
      : intl.formatMessage(messages.markAsWatched);

  return (
    <Tooltip content={tooltipContent}>
      <Button
        buttonType="ghost"
        buttonSize="sm"
        onClick={handleMarkAsWatched}
        disabled={isMarking}
        className="flex items-center gap-1 text-gray-400 hover:text-green-400"
      >
        <CheckCircleIcon className="h-5 w-5" />
      </Button>
    </Tooltip>
  );
};

export default MarkSeasonWatchedButton;
