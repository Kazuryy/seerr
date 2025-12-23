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
  inWatchlist: boolean;
  countdown: number;
  posterPath?: string;
  backdropPath?: string;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarDayColumnProps {
  day: CalendarDay;
}

const CalendarDayColumn: React.FC<CalendarDayColumnProps> = ({ day }) => {
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="flex min-w-[180px] flex-col">
      {/* Day Header (Sonarr style) */}
      <div
        className={`
          mb-3 rounded-lg p-3 text-center font-medium transition-all
          ${
            isToday
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
              : 'bg-gray-800 text-gray-400'
          }
        `}
      >
        <div className="text-xs">{dayName}</div>
        <div className="text-2xl font-bold">{dayNum}</div>
        <div className="text-xs opacity-75">{monthName}</div>
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
