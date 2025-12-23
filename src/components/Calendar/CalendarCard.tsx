import globalMessages from '@app/i18n/globalMessages';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { useIntl } from 'react-intl';

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

interface CalendarCardProps {
  item: CalendarItem;
}

const CalendarCard: React.FC<CalendarCardProps> = ({ item }) => {
  const intl = useIntl();
  const releaseDate = new Date(item.releaseDate);

  // Start time
  const startTime = releaseDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // End time estimate
  const endDate = new Date(releaseDate);
  endDate.setMinutes(endDate.getMinutes() + (item.type === 'movie' ? 120 : 50));
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const url =
    item.type === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`;

  // Episode format: "1x09"
  const episodeFormat =
    item.type === 'tv'
      ? `${item.seasonNumber}x${String(item.episodeNumber).padStart(2, '0')}`
      : null;

  // Determine border color based on status
  // Status values from Radarr/Sonarr: 'released', 'announced', etc.
  const getStatusColor = (status: string, hasFile: boolean) => {
    // If in watchlist, use special color
    if (item.inWatchlist) {
      return 'border-l-yellow-500'; // Watchlist items in gold
    }

    // Status-based colors
    if (hasFile) {
      return 'border-l-green-500'; // Downloaded (weekly episodes)
    } else if (status === 'released') {
      return 'border-l-orange-500'; // Released but not downloaded yet
    } else if (status === 'announced') {
      return 'border-l-blue-500'; // Announced/Coming soon
    } else if (status === 'inCinemas') {
      return 'border-l-purple-500'; // In theaters
    } else {
      return 'border-l-gray-500'; // Unknown status
    }
  };

  const borderColor = getStatusColor(item.status, item.hasFile);

  return (
    <Link href={url}>
      <a>
        <div
          className={`
            group relative overflow-hidden rounded-lg border-l-4 bg-gray-800
            shadow-lg ${borderColor}
            transition-all duration-300
            hover:scale-105 hover:shadow-xl hover:shadow-gray-900/50
          `}
        >
          {/* Banner/Fanart Image (16:9 for better episode visibility) */}
          <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
            {item.backdropPath ? (
              <Image
                src={item.backdropPath}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl opacity-10">
                {item.type === 'movie' ? '🎬' : '📺'}
              </div>
            )}

            {/* Gradient overlay extending to cover the entire card */}
            <div className="absolute inset-0 bottom-[-100px] bg-gradient-to-t from-gray-800 via-gray-900/60 to-transparent" />

            {/* Top badges - Using exact TitleCard style */}
            <div className="absolute left-0 right-0 flex items-center justify-between p-2">
              {/* Type badge (exact copy from TitleCard) */}
              <div
                className={`pointer-events-none z-40 self-start rounded-full border bg-opacity-80 shadow-md ${
                  item.type === 'movie'
                    ? 'border-blue-500 bg-blue-600'
                    : 'border-purple-600 bg-purple-600'
                }`}
              >
                <div className="flex h-4 items-center px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-white sm:h-5">
                  {item.type === 'movie'
                    ? intl.formatMessage(globalMessages.movie)
                    : intl.formatMessage(globalMessages.tvshow)}
                </div>
              </div>

              {/* Watchlist star (top right) */}
              {item.inWatchlist && (
                <div className="z-40">
                  <svg
                    className="h-5 w-5 text-yellow-400 drop-shadow-lg sm:h-6 sm:w-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Info section */}
          <div className="p-3">
            {/* Title */}
            <h3 className="mb-1 truncate text-sm font-bold text-white">
              {item.title}
            </h3>

            {/* Episode info (TV only) */}
            {item.type === 'tv' && (
              <div className="mb-1 truncate text-xs text-gray-400">
                <span className="font-semibold text-gray-300">
                  {episodeFormat}
                </span>
                {item.episodeTitle && (
                  <>
                    <span className="mx-1">·</span>
                    <span>{item.episodeTitle}</span>
                  </>
                )}
              </div>
            )}

            {/* Time range (like Sonarr) */}
            <div className="text-xs text-gray-500">
              {startTime} - {endTime}
            </div>
          </div>
        </div>
      </a>
    </Link>
  );
};

export default CalendarCard;
