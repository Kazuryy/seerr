import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import React, { useCallback, useEffect, useState } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarMobileView from './CalendarMobileView';
import CalendarTimeline from './CalendarTimeline';

interface CalendarItem {
  type: 'movie' | 'tv';
  tmdbId: number;
  tvdbId?: number;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  releaseDate: string;
  overview?: string;
  status?: string;
  inWatchlist: boolean;
  countdown: number;
  posterPath?: string;
  backdropPath?: string;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarResponse {
  results: CalendarDay[];
}

const Calendar: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CalendarDay[]>([]);

  // Filters
  const [watchlistOnly, setWatchlistOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (dateRange === 'week' ? 7 : 30));

      const params = new URLSearchParams({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        watchlistOnly: watchlistOnly ? 'true' : 'false',
        type: typeFilter,
      });

      const response = await fetch(`/api/v1/calendar/upcoming?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const result: CalendarResponse = await response.json();

      // Pad with empty days to always show 7 (or 30 for month)
      const daysToShow = dateRange === 'week' ? 7 : 30;
      const paddedData: CalendarDay[] = [];

      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const existingDay = result.results.find((d) => d.date === dateStr);
        paddedData.push(existingDay || { date: dateStr, items: [] });
      }

      setData(paddedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [watchlistOnly, typeFilter, dateRange]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return (
    <>
      <PageTitle title="Calendar" />

      <div className="mb-6">
        <CalendarHeader
          watchlistOnly={watchlistOnly}
          typeFilter={typeFilter}
          dateRange={dateRange}
          onWatchlistChange={setWatchlistOnly}
          onTypeFilterChange={setTypeFilter}
          onDateRangeChange={setDateRange}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-600 p-4 text-white">
          <p>Error loading calendar: {error}</p>
          <button
            onClick={fetchCalendar}
            className="mt-2 rounded bg-red-700 px-4 py-2 hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="rounded-lg bg-gray-800 p-8 text-center">
          <p className="text-gray-400">
            No upcoming releases found.
            {watchlistOnly && (
              <span className="mt-2 block">
                Try disabling "Watchlist Only" to see all releases.
              </span>
            )}
          </p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          {isMobile ? (
            <CalendarMobileView data={data} />
          ) : (
            <CalendarTimeline data={data} />
          )}
        </>
      )}
    </>
  );
};

export default Calendar;
