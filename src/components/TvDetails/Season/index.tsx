import AirDateBadge from '@app/components/AirDateBadge';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Tooltip from '@app/components/Common/Tooltip';
import useEpisodeWatchStatus from '@app/hooks/useEpisodeWatchStatus';
import defineMessages from '@app/utils/defineMessages';
import { CheckCircleIcon as CheckCircleOutline } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import type { SeasonWithEpisodes } from '@server/models/Tv';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.TvDetails.Season', {
  somethingwentwrong: 'Something went wrong while retrieving season data.',
  noepisodes: 'Episode list unavailable.',
  markAsWatched: 'Mark as watched',
  unmarkEpisode: 'Unmark episode',
  watched: 'Watched',
  watchedManually: 'Marked manually',
});

type SeasonProps = {
  seasonNumber: number;
  tvId: number;
  tmdbId: number;
};

const Season = ({ seasonNumber, tvId, tmdbId }: SeasonProps) => {
  const intl = useIntl();
  const { data, error } = useSWR<SeasonWithEpisodes>(
    `/api/v1/tv/${tvId}/season/${seasonNumber}`
  );

  const { seasonStatus, markEpisode, unmarkEpisode } = useEpisodeWatchStatus(
    tmdbId,
    seasonNumber
  );

  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<number>>(
    new Set()
  );

  const handleToggleEpisode = async (episodeNumber: number) => {
    setLoadingEpisodes((prev) => new Set(prev).add(episodeNumber));

    const isWatched =
      seasonStatus?.watchedEpisodeNumbers?.includes(episodeNumber);
    const isManual =
      seasonStatus?.manualEpisodeNumbers?.includes(episodeNumber);

    if (isWatched && isManual) {
      await unmarkEpisode(episodeNumber);
    } else if (!isWatched) {
      await markEpisode(episodeNumber);
    }
    // If watched but not manual (synced from media server), do nothing

    setLoadingEpisodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(episodeNumber);
      return newSet;
    });
  };

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <div>{intl.formatMessage(messages.somethingwentwrong)}</div>;
  }

  return (
    <div className="flex flex-col justify-center divide-y divide-gray-700">
      {data.episodes.length === 0 ? (
        <p>{intl.formatMessage(messages.noepisodes)}</p>
      ) : (
        data.episodes
          .slice()
          .reverse()
          .map((episode) => {
            const isWatched =
              seasonStatus?.watchedEpisodeNumbers?.includes(
                episode.episodeNumber
              ) ?? false;
            const isManual =
              seasonStatus?.manualEpisodeNumbers?.includes(
                episode.episodeNumber
              ) ?? false;
            const isLoading = loadingEpisodes.has(episode.episodeNumber);

            const tooltipContent = isWatched
              ? isManual
                ? intl.formatMessage(messages.unmarkEpisode)
                : intl.formatMessage(messages.watched)
              : intl.formatMessage(messages.markAsWatched);

            return (
              <div
                className="flex flex-col space-y-4 py-4 xl:flex-row xl:space-y-4 xl:space-x-4"
                key={`season-${seasonNumber}-episode-${episode.episodeNumber}`}
              >
                {/* Episode watch checkbox */}
                <div className="flex items-center">
                  <Tooltip content={tooltipContent}>
                    <button
                      onClick={() => handleToggleEpisode(episode.episodeNumber)}
                      disabled={isLoading || (isWatched && !isManual)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isWatched
                          ? isManual
                            ? 'text-green-400 hover:text-red-400'
                            : 'cursor-default text-green-500'
                          : 'text-gray-500 hover:text-green-400'
                      } ${isLoading ? 'animate-pulse' : ''}`}
                    >
                      {isWatched ? (
                        <CheckCircleSolid className="h-6 w-6" />
                      ) : (
                        <CheckCircleOutline className="h-6 w-6" />
                      )}
                    </button>
                  </Tooltip>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col space-y-2 xl:flex-row xl:items-center xl:space-y-0 xl:space-x-2">
                    <h3 className="text-lg">
                      {episode.episodeNumber} - {episode.name}
                    </h3>
                    {episode.airDate && (
                      <AirDateBadge airDate={episode.airDate} />
                    )}
                    {isManual && (
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-400">
                        {intl.formatMessage(messages.watchedManually)}
                      </span>
                    )}
                  </div>
                  {episode.overview && <p>{episode.overview}</p>}
                </div>
                {episode.stillPath && (
                  <div className="relative aspect-video xl:h-32">
                    <CachedImage
                      type="tmdb"
                      className="rounded-lg object-contain"
                      src={episode.stillPath}
                      alt=""
                      fill
                    />
                  </div>
                )}
              </div>
            );
          })
      )}
    </div>
  );
};

export default Season;
