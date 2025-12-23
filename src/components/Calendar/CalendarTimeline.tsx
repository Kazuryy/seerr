import React from 'react';
import CalendarDayColumn from './CalendarDayColumn';

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

interface CalendarTimelineProps {
  data: CalendarDay[];
}

const CalendarTimeline: React.FC<CalendarTimelineProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto pb-4">
      {/* Horizontal scrollable grid (like Sonarr table) */}
      <div
        className="inline-grid min-w-full gap-3"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(180px, 1fr))`,
        }}
      >
        {data.map((day) => (
          <CalendarDayColumn key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
};

export default CalendarTimeline;
