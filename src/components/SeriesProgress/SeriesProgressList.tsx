import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import SeriesProgressBar from '@app/components/SeriesProgress/SeriesProgressBar';
import { useSeriesProgressList } from '@app/hooks/useSeriesProgress';
import defineMessages from '@app/utils/defineMessages';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.SeriesProgress.SeriesProgressList',
  {
    seriesProgress: 'Series Progress',
    inProgress: 'In Progress',
    completed: 'Completed',
    abandoned: 'Abandoned',
    all: 'All',
    noSeriesProgress: 'No series progress tracked yet',
    startWatching: 'Start watching series to see your progress here',
    sortByLastWatched: 'Last Watched',
    sortByPercentage: 'Completion %',
    episodes: '{count} episodes',
  }
);

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'abandoned';
type SortOption = 'lastWatched' | 'percentage';

interface SeriesProgressListProps {
  take?: number;
  showFilters?: boolean;
}

const SeriesProgressList = ({
  take = 20,
  showFilters = true,
}: SeriesProgressListProps) => {
  const intl = useIntl();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('lastWatched');

  const { data, isLoading, error } = useSeriesProgressList({
    status: statusFilter,
    sortBy,
    take,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-red-400">
        Failed to load series progress
      </div>
    );
  }

  const results = data?.results || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center text-xl font-bold text-white">
          <ChartBarIcon className="mr-2 h-6 w-6" />
          {intl.formatMessage(messages.seriesProgress)}
        </h2>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-1">
            {(
              ['all', 'in_progress', 'completed', 'abandoned'] as StatusFilter[]
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status === 'all'
                  ? intl.formatMessage(messages.all)
                  : status === 'in_progress'
                  ? intl.formatMessage(messages.inProgress)
                  : status === 'completed'
                  ? intl.formatMessage(messages.completed)
                  : intl.formatMessage(messages.abandoned)}
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy('lastWatched')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sortBy === 'lastWatched'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {intl.formatMessage(messages.sortByLastWatched)}
            </button>
            <button
              onClick={() => setSortBy('percentage')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sortBy === 'percentage'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {intl.formatMessage(messages.sortByPercentage)}
            </button>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
          <ChartBarIcon className="mx-auto mb-4 h-12 w-12 text-gray-500" />
          <p className="text-gray-300">
            {intl.formatMessage(messages.noSeriesProgress)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {intl.formatMessage(messages.startWatching)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((progress) => (
            <div
              key={progress.mediaId}
              className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-4 text-gray-400 shadow-md ring-1 ring-gray-700 xl:h-28 xl:flex-row"
            >
              {/* Backdrop Image */}
              {progress.backdropPath && (
                <div className="absolute inset-0 z-0 w-full overflow-hidden bg-cover bg-center xl:w-2/3">
                  <CachedImage
                    type="tmdb"
                    src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${progress.backdropPath}`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fill
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, rgba(31, 41, 55, 0.47) 0%, rgba(31, 41, 55, 1) 100%)',
                    }}
                  />
                </div>
              )}
              <div className="relative flex w-full flex-col justify-between overflow-hidden sm:flex-row">
                {/* Poster and Title Section */}
                <div className="relative z-10 flex w-full items-center overflow-hidden pl-4 pr-4 sm:pr-0 xl:w-7/12 2xl:w-2/3">
                  <Link
                    href={`/tv/${progress.tmdbId}`}
                    className="relative h-auto w-12 flex-shrink-0 scale-100 transform-gpu overflow-hidden rounded-md transition duration-300 hover:scale-105"
                  >
                    <CachedImage
                      type="tmdb"
                      src={
                        progress.posterPath
                          ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${progress.posterPath}`
                          : '/images/seerr_poster_not_found.png'
                      }
                      alt=""
                      sizes="100vw"
                      style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                      width={600}
                      height={900}
                    />
                  </Link>
                  <div className="flex flex-col justify-center overflow-hidden pl-2 xl:pl-4">
                    <Link
                      href={`/tv/${progress.tmdbId}`}
                      className="mr-2 min-w-0 truncate text-lg font-bold text-white hover:underline xl:text-xl"
                    >
                      {progress.title || `Series ${progress.tmdbId}`}
                    </Link>
                    <div className="text-sm text-gray-400">
                      {progress.totalSeasons} seasons •{' '}
                      {intl.formatMessage(messages.episodes, {
                        count: progress.totalEpisodes,
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-4">
                  <SeriesProgressBar
                    watchedEpisodes={progress.watchedEpisodes}
                    totalEpisodes={progress.totalEpisodes}
                    completionPercentage={progress.completionPercentage}
                    status={progress.status}
                    isOngoing={progress.isOngoing}
                    compact
                  />
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {progress.watchedEpisodes} / {progress.totalEpisodes} (
                      {progress.completionPercentage.toFixed(1)}%)
                    </span>
                    {progress.lastWatchedAt && (
                      <span>
                        {new Date(progress.lastWatchedAt).toLocaleDateString(
                          intl.locale,
                          {
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.pageInfo && data.pageInfo.results > take && (
        <div className="text-center">
          <Link
            href="/activity?tab=series"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            View all {data.pageInfo.results} series →
          </Link>
        </div>
      )}
    </div>
  );
};

export default SeriesProgressList;
