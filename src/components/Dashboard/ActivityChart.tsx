import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useActivityChart } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import {
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const messages = defineMessages('components.Dashboard.ActivityChart', {
  title: 'Watch Activity',
  daily: 'Daily',
  weekly: 'Weekly',
  movies: 'Movies',
  episodes: 'Episodes',
  noActivity: 'No watch activity yet',
  lastMonth: 'Last 30 days',
  last3Months: 'Last 3 months',
  watches: '{count} watches',
});

interface ActivityChartProps {
  userId: number;
}

const ActivityChart = ({ userId }: ActivityChartProps) => {
  const intl = useIntl();
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const { data, isLoading } = useActivityChart(userId, view);

  // Get the last 30 days for daily or ~12 weeks (3 months) for weekly
  const displayData = data?.data?.slice(view === 'daily' ? -30 : -12) || [];

  // Calculate totals
  const totalMovies = displayData.reduce((sum, d) => sum + d.movies, 0);
  const totalEpisodes = displayData.reduce((sum, d) => sum + d.episodes, 0);

  // Format date for X-axis (show only some labels to avoid crowding)
  const formatXAxis = (dateStr: string, index: number) => {
    if (view === 'weekly') {
      return formatDateShort(dateStr);
    }
    // For daily, show label every ~7 days
    if (index % 7 === 0 || index === displayData.length - 1) {
      return formatDateShort(dateStr);
    }
    return '';
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { value: number; dataKey: string; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload || !label) return null;

    const movies = payload.find((p) => p.dataKey === 'movies')?.value || 0;
    const episodes = payload.find((p) => p.dataKey === 'episodes')?.value || 0;
    const total = movies + episodes;

    return (
      <div className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 shadow-xl">
        <p className="mb-1 font-medium text-white">{formatDate(label)}</p>
        <p className="text-sm text-gray-300">
          {intl.formatMessage(messages.watches, { count: total })}
        </p>
        {movies > 0 && (
          <p className="text-sm text-blue-400">
            {movies} {intl.formatMessage(messages.movies).toLowerCase()}
          </p>
        )}
        {episodes > 0 && (
          <p className="text-sm text-purple-400">
            {episodes} {intl.formatMessage(messages.episodes).toLowerCase()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <ChartBarIcon className="mr-2 h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-white">
            {intl.formatMessage(messages.title)}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('daily')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'daily'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.daily)}
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'weekly'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {intl.formatMessage(messages.weekly)}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : displayData.length === 0 ||
        displayData.every((d) => d.total === 0) ? (
        <div className="flex h-48 flex-col items-center justify-center text-gray-400">
          <CalendarDaysIcon className="mb-2 h-12 w-12 opacity-50" />
          <p>{intl.formatMessage(messages.noActivity)}</p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
            <span>
              {view === 'daily'
                ? intl.formatMessage(messages.lastMonth)
                : intl.formatMessage(messages.last3Months)}
            </span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>
                  {intl.formatMessage(messages.movies)} ({totalMovies})
                </span>
              </div>
              <div className="flex items-center">
                <div className="mr-1.5 h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span>
                  {intl.formatMessage(messages.episodes)} ({totalEpisodes})
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorMovies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEpisodes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="movies"
                  stackId="1"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorMovies)"
                />
                <Area
                  type="monotone"
                  dataKey="episodes"
                  stackId="1"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#colorEpisodes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default ActivityChart;
