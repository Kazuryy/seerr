import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import SeriesProgressBar from '@app/components/SeriesProgress/SeriesProgressBar';
import { useSeriesProgress } from '@app/hooks/useSeriesProgress';
import defineMessages from '@app/utils/defineMessages';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.SeriesProgress.SeriesProgressSection',
  {
    seriesProgress: 'Series Progress',
    episodesWatched: '{count} episodes watched',
    noProgressYet: 'No progress tracked yet',
    startWatching: 'Start watching to track your progress',
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
      <div className="h-full rounded-lg border border-gray-700 bg-gray-800 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  // Only show if there's progress data
  if (!progress || progress.watchedEpisodes === 0) {
    return null;
  }

  return (
    <div className="h-full rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h3 className="mb-4 flex items-center text-lg font-bold text-white">
        <ChartBarIcon className="mr-2 h-5 w-5" />
        {intl.formatMessage(messages.seriesProgress)}
      </h3>

      <SeriesProgressBar
        watchedEpisodes={progress.watchedEpisodes}
        totalEpisodes={progress.totalEpisodes}
        completionPercentage={progress.completionPercentage}
        status={progress.status}
        isOngoing={progress.isOngoing}
      />

      {progress.lastWatchedAt && (
        <div className="mt-3 text-xs text-gray-400">
          Last watched:{' '}
          {new Date(progress.lastWatchedAt).toLocaleDateString(intl.locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}
    </div>
  );
};

export default SeriesProgressSection;
