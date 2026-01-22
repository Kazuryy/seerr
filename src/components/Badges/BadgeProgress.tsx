import Alert from '@app/components/Common/Alert';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useBadgeProgress } from '@app/hooks/useBadges';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Badges.BadgeProgress', {
  yourProgress: 'Your Progress',
  moviesWatched: 'Movies Watched',
  seriesWatched: 'Series Watched',
  episodesWatched: 'Episodes Watched',
  reviewsWritten: 'Reviews Written',
  nextBadge: 'Next badge at {target}',
});

interface BadgeProgressProps {
  userId: number;
}

const BadgeProgress = ({ userId }: BadgeProgressProps) => {
  const intl = useIntl();
  const { progress, isLoading, error } = useBadgeProgress(userId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert title="Error" type="error">
        Failed to load progress
      </Alert>
    );
  }

  if (!progress) {
    return null;
  }

  // Define milestones for each category
  const movieMilestones = [10, 50, 100, 250, 500, 1000];
  const seriesMilestones = [5, 10, 25, 50, 100, 250];
  const episodeMilestones = [100, 500, 1000, 5000];
  const reviewMilestones = [1, 10, 50, 100];

  // Find next milestone for each category
  const findNextMilestone = (current: number, milestones: number[]) => {
    return milestones.find((m) => m > current) || milestones[milestones.length - 1];
  };

  const nextMovieMilestone = findNextMilestone(progress.movies, movieMilestones);
  const nextSeriesMilestone = findNextMilestone(
    progress.series,
    seriesMilestones
  );
  const nextEpisodeMilestone = findNextMilestone(
    progress.episodes,
    episodeMilestones
  );
  const nextReviewMilestone = findNextMilestone(
    progress.reviews,
    reviewMilestones
  );

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const progressItems = [
    {
      label: intl.formatMessage(messages.moviesWatched),
      current: progress.movies,
      next: nextMovieMilestone,
      icon: '🎬',
      color: 'from-blue-600 to-blue-400',
    },
    {
      label: intl.formatMessage(messages.seriesWatched),
      current: progress.series,
      next: nextSeriesMilestone,
      icon: '📺',
      color: 'from-indigo-600 to-indigo-400',
    },
    {
      label: intl.formatMessage(messages.episodesWatched),
      current: progress.episodes,
      next: nextEpisodeMilestone,
      icon: '🎞️',
      color: 'from-purple-600 to-purple-400',
    },
    {
      label: intl.formatMessage(messages.reviewsWritten),
      current: progress.reviews,
      next: nextReviewMilestone,
      icon: '✍️',
      color: 'from-green-600 to-green-400',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">
        {intl.formatMessage(messages.yourProgress)}
      </h3>

      {progressItems.map((item) => {
        const progressPercent = calculateProgress(item.current, item.next);
        const isComplete = item.current >= item.next;

        return (
          <div
            key={item.label}
            className="rounded-lg border border-gray-700 bg-gray-800 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-white">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {item.current}
                </div>
                {!isComplete && (
                  <div className="text-xs text-gray-400">
                    {intl.formatMessage(messages.nextBadge, {
                      target: item.next,
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Progress Text */}
            <div className="mt-1 text-right text-xs text-gray-400">
              {isComplete
                ? 'Complete!'
                : `${item.current} / ${item.next} (${Math.round(progressPercent)}%)`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeProgress;
