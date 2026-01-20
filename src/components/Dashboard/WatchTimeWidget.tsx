import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useWatchTime } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.WatchTimeWidget', {
  title: 'Total Watch Time',
  years: '{count, plural, one {# year} other {# years}}',
  months: '{count, plural, one {# month} other {# months}}',
  days: '{count, plural, one {# day} other {# days}}',
  hours: '{count, plural, one {# hour} other {# hours}}',
  minutes: '{count, plural, one {# minute} other {# minutes}}',
  noWatchTime: 'No watch time yet',
  startWatching: 'Start watching to track your time!',
  basedOn: 'Based on {movies} movies & {episodes} episodes',
});

interface WatchTimeWidgetProps {
  userId: number;
}

const WatchTimeWidget = ({ userId }: WatchTimeWidgetProps) => {
  const intl = useIntl();
  const { data, isLoading } = useWatchTime(userId);

  const hasWatchTime = data && data.totalMinutes > 0;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-3 flex items-center">
        <ClockIcon className="mr-2 h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold text-white">
          {intl.formatMessage(messages.title)}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : !hasWatchTime ? (
        <div className="py-4 text-center">
          <div className="mb-2 text-3xl opacity-50">⏱️</div>
          <p className="text-sm text-gray-400">
            {intl.formatMessage(messages.noWatchTime)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {intl.formatMessage(messages.startWatching)}
          </p>
        </div>
      ) : (
        <div>
          {/* Time units breakdown */}
          <div className="mb-3 grid grid-cols-5 gap-1 text-center">
            <TimeUnit
              value={data.breakdown.years}
              label="Years"
              highlight={data.breakdown.years > 0}
            />
            <TimeUnit
              value={data.breakdown.months}
              label="Months"
              highlight={data.breakdown.months > 0}
            />
            <TimeUnit
              value={data.breakdown.days}
              label="Days"
              highlight={data.breakdown.days > 0}
            />
            <TimeUnit
              value={data.breakdown.hours}
              label="Hours"
              highlight={data.breakdown.hours > 0}
            />
            <TimeUnit
              value={data.breakdown.minutes}
              label="Minutes"
              highlight={data.breakdown.minutes > 0}
            />
          </div>

          {/* Based on info */}
          <p className="text-xs text-gray-500">
            {intl.formatMessage(messages.basedOn, {
              movies: data.watchCounts.movies,
              episodes: data.watchCounts.episodes,
            })}
          </p>
        </div>
      )}
    </div>
  );
};

interface TimeUnitProps {
  value: number;
  label: string;
  highlight?: boolean;
}

const TimeUnit = ({ value, label, highlight }: TimeUnitProps) => (
  <div
    className={`rounded-md p-2 ${
      highlight ? 'bg-gray-700' : 'bg-gray-800/50'
    }`}
  >
    <div
      className={`text-lg font-bold ${
        highlight ? 'text-green-400' : 'text-gray-500'
      }`}
    >
      {value}
    </div>
    <div className="text-[10px] text-gray-500">{label}</div>
  </div>
);

export default WatchTimeWidget;
