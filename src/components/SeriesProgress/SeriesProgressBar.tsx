import Tooltip from '@app/components/Common/Tooltip';
import defineMessages from '@app/utils/defineMessages';
import { CheckCircleIcon, PlayIcon } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.SeriesProgress.SeriesProgressBar', {
  progress: '{watched} / {total} episodes ({percentage}%)',
  completed: 'Completed!',
  inProgress: 'In Progress',
  notStarted: 'Not Started',
  abandoned: 'Abandoned',
  ongoing: 'Series ongoing',
});

export interface SeriesProgressBarProps {
  watchedEpisodes: number;
  totalEpisodes: number;
  completionPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  isOngoing?: boolean;
  compact?: boolean;
}

const SeriesProgressBar = ({
  watchedEpisodes,
  totalEpisodes,
  completionPercentage,
  status,
  isOngoing = false,
  compact = false,
}: SeriesProgressBarProps) => {
  const intl = useIntl();

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'from-green-500 to-green-400';
      case 'in_progress':
        return 'from-indigo-500 to-indigo-400';
      case 'abandoned':
        return 'from-gray-500 to-gray-400';
      default:
        return 'from-gray-600 to-gray-500';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return intl.formatMessage(messages.completed);
      case 'in_progress':
        return intl.formatMessage(messages.inProgress);
      case 'abandoned':
        return intl.formatMessage(messages.abandoned);
      default:
        return intl.formatMessage(messages.notStarted);
    }
  };

  const progressText = intl.formatMessage(messages.progress, {
    watched: watchedEpisodes,
    total: totalEpisodes,
    percentage: completionPercentage.toFixed(1),
  });

  if (compact) {
    return (
      <Tooltip content={progressText}>
        <div className="flex items-center space-x-2">
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-300`}
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
          {status === 'completed' && (
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          )}
          {status === 'in_progress' && (
            <PlayIcon className="h-4 w-4 text-indigo-400" />
          )}
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          {status === 'completed' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : status === 'in_progress' ? (
            <PlayIcon className="h-5 w-5 text-indigo-400" />
          ) : null}
          <span className="font-medium text-white">{getStatusLabel()}</span>
          {isOngoing && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
              {intl.formatMessage(messages.ongoing)}
            </span>
          )}
        </div>
        <span className="text-gray-400">
          {watchedEpisodes} / {totalEpisodes}
        </span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-500`}
          style={{ width: `${Math.min(completionPercentage, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{completionPercentage.toFixed(1)}% complete</span>
        {totalEpisodes - watchedEpisodes > 0 && status !== 'completed' && (
          <span>{totalEpisodes - watchedEpisodes} episodes remaining</span>
        )}
      </div>
    </div>
  );
};

export default SeriesProgressBar;
