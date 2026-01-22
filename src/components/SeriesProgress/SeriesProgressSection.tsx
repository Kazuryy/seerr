import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useSeriesProgress } from '@app/hooks/useSeriesProgress';
import defineMessages from '@app/utils/defineMessages';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, PlayIcon } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.SeriesProgress.SeriesProgressSection',
  {
    seriesProgress: 'Progress',
    episodes: '{watched}/{total} ep',
    ongoing: 'Ongoing',
  }
);

interface SeriesProgressSectionProps {
  mediaId: number;
}

const SeriesProgressSection = ({ mediaId }: SeriesProgressSectionProps) => {
  const intl = useIntl();
  const { data: progress, isLoading } = useSeriesProgress(mediaId);

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
  const statusColor = isCompleted
    ? 'from-green-500 to-green-400'
    : 'from-indigo-500 to-indigo-400';

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
    </div>
  );
};

export default SeriesProgressSection;
