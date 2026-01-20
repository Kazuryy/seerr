import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useWatchStreak } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { FireIcon } from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.StreakWidget', {
  title: 'Watch Streak',
  currentStreak: 'Current Streak',
  longestStreak: 'Longest Streak',
  days: '{count, plural, one {# day} other {# days}}',
  noStreak: 'No streak yet',
  startStreak: 'Watch something to start your streak!',
  watchedToday: 'Watched today',
  watchToKeepStreak: 'Watch today to keep your streak!',
  streakAtRisk: 'Streak at risk!',
  lastWatched: 'Last watched: {date}',
});

interface StreakWidgetProps {
  userId: number;
}

const StreakWidget = ({ userId }: StreakWidgetProps) => {
  const intl = useIntl();
  const { data, isLoading } = useWatchStreak(userId);

  const hasStreak = data && (data.currentStreak > 0 || data.longestStreak > 0);

  // Check if user watched today
  const watchedToday = (() => {
    if (!data?.lastWatchDate) return false;
    const today = new Date();
    const lastWatch = new Date(data.lastWatchDate);
    return (
      today.getFullYear() === lastWatch.getFullYear() &&
      today.getMonth() === lastWatch.getMonth() &&
      today.getDate() === lastWatch.getDate()
    );
  })();

  const formatLastWatched = () => {
    if (!data?.lastWatchDate) return '';
    const date = new Date(data.lastWatchDate);
    return intl.formatMessage(messages.lastWatched, {
      date: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    });
  };

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-3 flex items-center">
        <FireIcon className="mr-2 h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-white">
          {intl.formatMessage(messages.title)}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : !hasStreak ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-2 text-3xl opacity-50">🔥</div>
          <p className="text-sm text-gray-400">
            {intl.formatMessage(messages.noStreak)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {intl.formatMessage(messages.startStreak)}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {/* Current streak - prominent */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">
                {intl.formatMessage(messages.currentStreak)}
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-white">
                  {data?.currentStreak || 0}
                </span>
                <span className="ml-1 text-sm text-gray-400">
                  {(data?.currentStreak || 0) === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Streak fire animation */}
            <div className="relative">
              {data?.streakActive && data.currentStreak > 0 ? (
                <FireIconSolid className="h-12 w-12 animate-pulse text-orange-500" />
              ) : (
                <FireIcon className="h-12 w-12 text-gray-600" />
              )}
            </div>
          </div>

          {/* Streak status */}
          <div
            className={`mb-3 rounded-md px-3 py-2 text-center text-sm ${
              watchedToday
                ? 'bg-green-900/30 text-green-400'
                : data?.streakActive
                  ? 'bg-yellow-900/30 text-yellow-400'
                  : 'bg-red-900/30 text-red-400'
            }`}
          >
            {watchedToday ? (
              <span className="flex items-center justify-center">
                <span className="mr-2">✓</span>
                {intl.formatMessage(messages.watchedToday)}
              </span>
            ) : data?.streakActive ? (
              <span className="flex items-center justify-center">
                <span className="mr-2">⚠</span>
                {intl.formatMessage(messages.watchToKeepStreak)}
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">✗</span>
                {intl.formatMessage(messages.streakAtRisk)}
              </span>
            )}
          </div>

          {/* Longest streak */}
          <div className="mt-auto flex items-center justify-between border-t border-gray-700 pt-3">
            <div className="text-sm text-gray-400">
              {intl.formatMessage(messages.longestStreak)}
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-orange-400">
                {data?.longestStreak || 0}
              </span>
              <span className="ml-1 text-sm text-gray-400">
                {(data?.longestStreak || 0) === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Last watched */}
          {data?.lastWatchDate && (
            <div className="mt-2 text-xs text-gray-500">
              {formatLastWatched()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreakWidget;
