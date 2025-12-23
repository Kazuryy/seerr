import React from 'react';

interface CalendarHeaderProps {
  watchlistOnly: boolean;
  typeFilter: 'all' | 'movie' | 'tv';
  dateRange: 'week' | 'month';
  onWatchlistChange: (value: boolean) => void;
  onTypeFilterChange: (value: 'all' | 'movie' | 'tv') => void;
  onDateRangeChange: (value: 'week' | 'month') => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  watchlistOnly,
  typeFilter,
  dateRange,
  onWatchlistChange,
  onTypeFilterChange,
  onDateRangeChange,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="flex flex-wrap gap-3">
        {/* Watchlist Toggle with Star Icon */}
        <button
          onClick={() => onWatchlistChange(!watchlistOnly)}
          className={`
            flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all
            ${
              watchlistOnly
                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                : 'border-2 border-gray-700 bg-transparent text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
            }
          `}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
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
              appearance-none rounded-lg px-4 py-2 pr-9 font-medium transition-all
              ${
                typeFilter !== 'all'
                  ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                  : 'border-2 border-gray-700 bg-transparent text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
              }
            `}
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
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
              appearance-none rounded-lg px-4 py-2 pr-9 font-medium transition-all
              ${
                dateRange !== 'week'
                  ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                  : 'border-2 border-gray-700 bg-transparent text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
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
