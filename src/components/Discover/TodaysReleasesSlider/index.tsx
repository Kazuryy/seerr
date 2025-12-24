import Slider from '@app/components/Slider';
import defineMessages from '@app/utils/defineMessages';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import useSWR from 'swr';
import TodaysReleaseCard from './TodaysReleaseCard';

const messages = defineMessages('components.TodaysReleasesSlider', {
  todaysreleases: "Today's Releases",
});

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
}

const TodaysReleasesSlider = () => {
  const intl = useIntl();

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const { data, error } = useSWR<CalendarResponse>(
    `/api/v1/calendar/upcoming?start=${todayStr}&end=${todayStr}&type=all&watchlistOnly=false`
  );

  // Get today's releases
  const todaysItems =
    data?.results.find((day) => day.date === todayStr)?.items || [];

  if (error || !data) {
    return null;
  }

  if (todaysItems.length === 0) {
    return null;
  }

  // Convert calendar items to TodaysReleaseCard JSX elements
  const titleCards = todaysItems
    .slice(0, 20)
    .map((item) => (
      <TodaysReleaseCard
        key={`todays-releases-${item.tmdbId}-${item.seasonNumber}-${item.episodeNumber}`}
        item={item}
      />
    ));

  return (
    <>
      <div className="slider-header">
        <Link href="/calendar" className="slider-title">
          <span>{intl.formatMessage(messages.todaysreleases)}</span>
          <ArrowRightCircleIcon />
        </Link>
      </div>
      <Slider
        sliderKey="todays-releases"
        isLoading={!data && !error}
        isEmpty={titleCards.length === 0}
        items={titleCards}
      />
    </>
  );
};

export default TodaysReleasesSlider;
