import React, { useState } from 'react';
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
  status: string;
  hasFile: boolean;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarMobileViewProps {
  data: CalendarDay[];
}

const CalendarMobileView: React.FC<CalendarMobileViewProps> = ({ data }) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const currentDay = data[currentDayIndex];

  const goToPrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < data.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  if (!currentDay) {
    return <div className="text-center text-gray-400">No data available</div>;
  }

  const date = new Date(currentDay.date);
  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div>
      {/* Date Navigation */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-800 p-4">
        <button
          onClick={goToPrevDay}
          disabled={currentDayIndex === 0}
          className="rounded p-2 hover:bg-gray-700 disabled:opacity-30"
        >
          ←
        </button>

        <div className="text-center">
          <div className="text-lg font-bold">{dateString}</div>
          <div className="text-sm text-gray-400">
            Day {currentDayIndex + 1} of {data.length}
          </div>
        </div>

        <button
          onClick={goToNextDay}
          disabled={currentDayIndex === data.length - 1}
          className="rounded p-2 hover:bg-gray-700 disabled:opacity-30"
        >
          →
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {currentDay.items.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center text-gray-400">
            No releases this day
          </div>
        ) : (
          currentDay.items.map((item, index) => (
            <CalendarCard key={`${item.tmdbId}-${index}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarMobileView;
