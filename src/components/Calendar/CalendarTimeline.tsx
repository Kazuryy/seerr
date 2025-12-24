import React, { useEffect, useRef } from 'react';
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
  status: string;
  hasFile: boolean;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarTimelineProps {
  data: CalendarDay[];
  isMonthView?: boolean;
}

const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  data,
  isMonthView = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today's date on mount and when data changes (mobile only)
  useEffect(() => {
    if (!scrollContainerRef.current || data.length === 0) return;

    // Check if mobile (screen width < 768px)
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // Find today's index in the data
    const todayIndex = data.findIndex((day) => day.date === todayStr);

    if (todayIndex !== -1) {
      // Today is in the current view, scroll to it
      const columnWidth = isMonthView ? 140 : 180;
      const scrollPosition = todayIndex * (columnWidth + 12); // +12 for gap
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
    } else {
      // Today is not in view, scroll to start (Monday)
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [data, isMonthView]);

  if (isMonthView) {
    // Month view: Grid layout on desktop, horizontal scroll on mobile
    return (
      <>
        {/* Desktop: 7-column grid */}
        <div className="hidden grid-cols-7 gap-3 sm:grid">
          {data.map((day) => (
            <CalendarDayColumn key={day.date} day={day} isMonthView={true} />
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 sm:hidden"
        >
          <div
            className="inline-grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${data.length}, minmax(140px, 1fr))`,
            }}
          >
            {data.map((day) => (
              <CalendarDayColumn key={day.date} day={day} isMonthView={false} />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Week view: Horizontal scrollable (Sonarr style)
  return (
    <div
      ref={scrollContainerRef}
      className="overflow-x-auto pb-4"
      style={{ minHeight: 'calc(100vh - 200px)' }}
    >
      <div
        className="inline-grid min-w-full gap-3"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(180px, 1fr))`,
        }}
      >
        {data.map((day) => (
          <CalendarDayColumn key={day.date} day={day} isMonthView={false} />
        ))}
      </div>
    </div>
  );
};

export default CalendarTimeline;
