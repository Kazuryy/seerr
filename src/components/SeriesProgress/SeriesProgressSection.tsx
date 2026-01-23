import Spinner from '@app/assets/spinner.svg';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Tooltip from '@app/components/Common/Tooltip';
import { useSeriesProgress } from '@app/hooks/useSeriesProgress';
import defineMessages from '@app/utils/defineMessages';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages(
  'components.SeriesProgress.SeriesProgressSection',
  {
    seriesProgress: 'Progress',
    episodes: '{watched}/{total} ep',
    ongoing: 'Ongoing',
    abandonSeries: 'Drop Series',
    resumeSeries: 'Resume Series',
    abandonSuccess: 'Series dropped successfully',
    resumeSuccess: 'Series resumed successfully',
    error: 'An error occurred',
  }
);

interface SeriesProgressSectionProps {
  mediaId: number;
  onUpdate?: () => void;
}

const SeriesProgressSection = ({
  mediaId,
  onUpdate,
}: SeriesProgressSectionProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    data: progress,
    isLoading,
    abandonSeries,
    resumeSeries,
  } = useSeriesProgress(mediaId);

  if (isLoading) {
    return (
      <div className="flex h-28 w-48 items-center justify-center rounded-lg border border-gray-700 bg-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  // Only show if there's progress data
  if (!progress || progress.watchedEpisodes === 0) {
    return null;
  }

  const isCompleted = progress.status === 'completed';
  const isAbandoned = progress.status === 'abandoned';
  const statusColor = isCompleted
    ? 'from-green-500 to-green-400'
    : isAbandoned
    ? 'from-red-500 to-red-400'
    : 'from-indigo-500 to-indigo-400';

  const handleAbandon = async () => {
    setIsUpdating(true);
    try {
      await abandonSeries();
      addToast(intl.formatMessage(messages.abandonSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      onUpdate?.();
    } catch {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
    setIsUpdating(false);
  };

  const handleResume = async () => {
    setIsUpdating(true);
    try {
      await resumeSeries();
      addToast(intl.formatMessage(messages.resumeSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      onUpdate?.();
    } catch {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
    setIsUpdating(false);
  };

  return (
    <div className="flex w-48 flex-col rounded-lg border border-gray-700 bg-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between text-gray-400">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {intl.formatMessage(messages.seriesProgress)}
          </span>
        </div>
        {isCompleted ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : isAbandoned ? (
          <XCircleIcon className="h-5 w-5 text-red-500" />
        ) : (
          <PlayIcon className="h-5 w-5 text-indigo-400" />
        )}
      </div>

      {/* Episode count */}
      <div className="mt-3 text-2xl font-bold text-white">
        {intl.formatMessage(messages.episodes, {
          watched: progress.watchedEpisodes,
          total: progress.totalEpisodes,
        })}
        {progress.isOngoing && (
          <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-xs font-normal text-blue-400">
            {intl.formatMessage(messages.ongoing)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
          <div
            className={`h-full bg-gradient-to-r ${statusColor} transition-all duration-300`}
            style={{
              width: `${Math.min(progress.completionPercentage, 100)}%`,
            }}
          />
        </div>
        <span className="text-sm text-gray-400">
          {progress.completionPercentage.toFixed(0)}%
        </span>
      </div>

      {/* Abandon/Resume button */}
      {!isCompleted && (
        <Tooltip
          content={intl.formatMessage(
            isAbandoned ? messages.resumeSeries : messages.abandonSeries
          )}
        >
          <button
            onClick={isAbandoned ? handleResume : handleAbandon}
            disabled={isUpdating}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              isAbandoned
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isUpdating ? (
              <Spinner className="h-4 w-4" />
            ) : isAbandoned ? (
              <>
                <PlayIcon className="h-4 w-4" />
                {intl.formatMessage(messages.resumeSeries)}
              </>
            ) : (
              <>
                <StopIcon className="h-4 w-4" />
                {intl.formatMessage(messages.abandonSeries)}
              </>
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default SeriesProgressSection;
