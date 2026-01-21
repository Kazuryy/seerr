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
    startWatching: 'Start watching TV shows to see your progress here',
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
        <div className="space-y-3">
          {results.map((progress) => (
            <Link
              key={progress.mediaId}
              href={`/tv/${progress.tmdbId}`}
              className="block rounded-lg border border-gray-700 bg-gray-800 p-4 transition hover:border-gray-600"
            >
              <div className="flex gap-4">
                {/* Poster */}
                <div className="flex-shrink-0">
                  <CachedImage
                    type="tmdb"
                    src={
                      progress.posterPath
                        ? `https://image.tmdb.org/t/p/w92${progress.posterPath}`
                        : '/images/seerr_poster_not_found.png'
                    }
                    alt={progress.title || 'Series poster'}
                    width={60}
                    height={90}
                    className="rounded-md"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-medium text-white">
                    {progress.title || `Series ${progress.tmdbId}`}
                  </h3>

                  <div className="mb-2 text-xs text-gray-400">
                    {intl.formatMessage(messages.episodes, {
                      count: progress.totalEpisodes,
                    })}{' '}
                    • {progress.totalSeasons} seasons
                  </div>

                  <SeriesProgressBar
                    watchedEpisodes={progress.watchedEpisodes}
                    totalEpisodes={progress.totalEpisodes}
                    completionPercentage={progress.completionPercentage}
                    status={progress.status}
                    isOngoing={progress.isOngoing}
                    compact
                  />

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {progress.watchedEpisodes} / {progress.totalEpisodes} (
                      {progress.completionPercentage.toFixed(1)}%)
                    </span>
                    {progress.lastWatchedAt && (
                      <span>
                        Last:{' '}
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
            </Link>
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
