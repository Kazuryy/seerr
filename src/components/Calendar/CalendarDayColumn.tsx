import React from 'react';
import CalendarCard from './CalendarCard';

interface CalendarItem {
  type: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  releaseDate: string;
  releaseType?: 'digital' | 'physical' | 'inCinemas' | 'premiere';
  inWatchlist: boolean;
  countdown: number;
  posterPath?: string;
  backdropPath?: string;
  status: string;
  hasFile: boolean;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarDayColumnProps {
  day: CalendarDay;
  isMonthView?: boolean;
}

const CalendarDayColumn: React.FC<CalendarDayColumnProps> = ({
  day,
  isMonthView = false,
}) => {
  // Parse date in local timezone (YYYY-MM-DD format)
  const [year, month, dayOfMonth] = day.date.split('-').map(Number);
  const date = new Date(year, month - 1, dayOfMonth); // month is 0-indexed

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className={`flex flex-col ${isMonthView ? '' : 'min-w-[180px]'}`}>
      {/* Day Header (Compact version) */}
      <div
        className={`
          mb-2 rounded-md px-2 py-1.5 text-center font-medium transition-all
          ${
            isToday
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'bg-gray-800 text-gray-400'
          }
        `}
      >
        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="font-normal">{dayName}</span>
          <span className="text-lg font-bold">{dayNum}</span>
          <span className="font-normal opacity-75">{monthName}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {day.items.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
            <span className="text-xs text-gray-600">No releases</span>
          </div>
        ) : (
          day.items.map((item, index) => (
            <CalendarCard key={`${item.tmdbId}-${index}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarDayColumn;
