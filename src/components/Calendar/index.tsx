import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import React, { useCallback, useEffect, useState } from 'react';
import CalendarHeader from './CalendarHeader';
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
  status: string;
  hasFile: boolean;
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
  pagination?: {
    start: string;
    end: string;
    source: 'database' | 'direct';
    hasMore: boolean;
  };
}

const Calendar: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CalendarDay[]>([]);

  // Filters
  const [watchlistOnly, setWatchlistOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');
  const [dayOffset, setDayOffset] = useState(0); // Offset in days from today

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // Apply offset based on dateRange and mobile state
      if (dateRange === 'week') {
        // For week view: start on Monday of the current/offset week
        const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
        startDate.setDate(startDate.getDate() - daysToSubtract);

        // Both mobile and desktop: navigate by week (7 days at a time)
        const weekOffset = Math.floor(dayOffset / 7);
        startDate.setDate(startDate.getDate() + weekOffset * 7);
      } else {
        // For month view: start at the 1st day of the target month
        const monthOffset = Math.floor(dayOffset / 30); // Approximate month offset
        startDate.setMonth(startDate.getMonth() + monthOffset);
        startDate.setDate(1);

        // Adjust to Monday before or on the 1st to include previous month days
        const dayOfWeek = startDate.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysToSubtract);
      }

      let endDate = new Date(startDate);
      if (dateRange === 'week') {
        endDate.setDate(endDate.getDate() + 7);
      } else {
        // For month view: find the last day of the month, then extend to Sunday
        const monthDate = new Date();
        monthDate.setHours(0, 0, 0, 0);
        const monthOffset = Math.floor(dayOffset / 30);
        monthDate.setMonth(monthDate.getMonth() + monthOffset);
        monthDate.setMonth(monthDate.getMonth() + 1);
        monthDate.setDate(0); // Last day of the month

        // Find the Sunday after or on the last day of the month
        const lastDayOfWeek = monthDate.getDay();
        const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
        endDate = new Date(monthDate);
        endDate.setDate(endDate.getDate() + daysToAdd + 1); // +1 to include the last day
      }

      const params = new URLSearchParams({
        start: startDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format, local timezone
        end: endDate.toLocaleDateString('en-CA'),
        watchlistOnly: watchlistOnly ? 'true' : 'false',
        type: typeFilter,
      });

      const response = await fetch(`/api/v1/calendar/upcoming?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const result: CalendarResponse = await response.json();

      const paddedData: CalendarDay[] = [];

      if (dateRange === 'week') {
        // Week view: simple 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;

          const existingDay = result.results.find((d) => d.date === dateStr);
          paddedData.push(existingDay || { date: dateStr, items: [] });
        }
      } else {
        // Month view: already starts at Monday, just fill all days from API response
        // Calculate how many weeks we need (startDate is already Monday)
        const targetMonth = new Date();
        const monthOffset = Math.floor(dayOffset / 30);
        targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
        const lastDayOfTargetMonth = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0
        );

        // Extend endDate to the Sunday after the last day of the month
        const lastDayOfWeek = lastDayOfTargetMonth.getDay();
        const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
        endDate = new Date(lastDayOfTargetMonth);
        endDate.setDate(endDate.getDate() + daysToAdd);

        // Now fill paddedData with all days from startDate to endDate
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;

          const existingDay = result.results.find((d) => d.date === dateStr);
          paddedData.push(existingDay || { date: dateStr, items: [] });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      setData(paddedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [watchlistOnly, typeFilter, dateRange, dayOffset]);

  // Fetch on mount and when any dependency changes
  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Handle navigation
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setDayOffset(0);
    } else if (direction === 'prev') {
      if (dateRange === 'week') {
        // Week view (mobile & desktop): change by 7 days (1 week)
        setDayOffset(dayOffset - 7);
      } else {
        // Month view: change by ~30 days (1 month)
        setDayOffset(dayOffset - 30);
      }
    } else {
      if (dateRange === 'week') {
        // Week view (mobile & desktop): change by 7 days (1 week)
        setDayOffset(dayOffset + 7);
      } else {
        // Month view: change by ~30 days (1 month)
        setDayOffset(dayOffset + 30);
      }
    }
  };

  return (
    <>
      <PageTitle title="Calendar" />

      <div className="mb-6 mt-8">
        <CalendarHeader
          watchlistOnly={watchlistOnly}
          typeFilter={typeFilter}
          dateRange={dateRange}
          dayOffset={dayOffset}
          onWatchlistChange={setWatchlistOnly}
          onTypeFilterChange={setTypeFilter}
          onDateRangeChange={setDateRange}
          onNavigate={handleNavigate}
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
        <CalendarTimeline data={data} isMonthView={dateRange === 'month'} />
      )}
    </>
  );
};

export default Calendar;
