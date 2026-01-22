import React from 'react';

interface CalendarHeaderProps {
  watchlistOnly: boolean;
  typeFilter: 'all' | 'movie' | 'tv';
  dateRange: 'week' | 'month';
  dayOffset: number;
  onWatchlistChange: (value: boolean) => void;
  onTypeFilterChange: (value: 'all' | 'movie' | 'tv') => void;
  onDateRangeChange: (value: 'week' | 'month') => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  watchlistOnly,
  typeFilter,
  dateRange,
  dayOffset,
  onWatchlistChange,
  onTypeFilterChange,
  onDateRangeChange,
  onNavigate,
}) => {
  // Calculate current visible day display (e.g., "Monday, Dec 23, 2025")
  const getCurrentDayDisplay = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dateRange === 'week') {
      // For week view: show the week range (Monday - Sunday)
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      now.setDate(now.getDate() - daysToSubtract);

      const weekOffset = Math.floor(dayOffset / 7);
      now.setDate(now.getDate() + weekOffset * 7);

      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // If same month: "Dec 23-29, 2025", else "Dec 30, 2025 - Jan 5, 2026"
      if (now.getMonth() === weekEnd.getMonth()) {
        return `${now.toLocaleDateString('en-US', {
          month: 'short',
        })} ${now.getDate()}-${weekEnd.getDate()}, ${now.getFullYear()}`;
      } else {
        return `${now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })} - ${weekEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      }
    } else {
      // For month view: show the month name
      const monthOffset = Math.floor(dayOffset / 30);
      now.setMonth(now.getMonth() + monthOffset);
      return now.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: Title with current day and Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold leading-7 text-gray-100 sm:text-2xl sm:leading-9 lg:text-4xl">
            <span className="text-overseerr">Calendar</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-indigo-300 sm:text-base">
            {getCurrentDayDisplay()}
          </p>
        </div>

        {/* Navigation Controls - More visible with better colors */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onNavigate('prev')}
            className="rounded-lg bg-gray-800 p-3 text-indigo-400 shadow-lg transition-all hover:bg-gray-700 hover:text-indigo-300 active:scale-95"
            title="Previous"
            aria-label="Previous"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => onNavigate('today')}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-95"
          >
            Today
          </button>

          <button
            onClick={() => onNavigate('next')}
            className="rounded-lg bg-gray-800 p-3 text-indigo-400 shadow-lg transition-all hover:bg-gray-700 hover:text-indigo-300 active:scale-95"
            title="Next"
            aria-label="Next"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
        {/* Watchlist Toggle with Star Icon */}
        <button
          onClick={() => onWatchlistChange(!watchlistOnly)}
          className={`
            flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 font-semibold shadow-md transition-all active:scale-95
            ${
              watchlistOnly
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {watchlistOnly ? 'Watchlist' : 'All Releases'}
        </button>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) =>
              onTypeFilterChange(e.target.value as 'all' | 'movie' | 'tv')
            }
            className={`
              h-10 appearance-none whitespace-nowrap rounded-lg px-4 pr-9 font-semibold shadow-md transition-all active:scale-95
              ${
                typeFilter !== 'all'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">Series</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Date Range */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) =>
              onDateRangeChange(e.target.value as 'week' | 'month')
            }
            className={`
              h-10 appearance-none whitespace-nowrap rounded-lg px-4 pr-9 font-semibold shadow-md transition-all active:scale-95
              ${
                dateRange !== 'week'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
