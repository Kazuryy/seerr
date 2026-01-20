import Badge from '@app/components/Common/Badge';
import CachedImage from '@app/components/Common/CachedImage';
import defineMessages from '@app/utils/defineMessages';
import { StarIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { FormattedRelativeTime, useIntl } from 'react-intl';

const messages = defineMessages('components.UserActivity.ActivityItem', {
  watched: 'Watched',
  reviewed: 'Reviewed',
  rating: 'Rating',
  season: 'S{season}',
  episode: 'E{episode}',
  rewatch: 'Rewatch #{count}',
  containsSpoilers: 'Spoilers',
  private: 'Private',
});

export interface ActivityItemMedia {
  id: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title?: string;
  posterPath?: string;
  backdropPath?: string;
}

interface BaseActivityItemProps {
  media?: ActivityItemMedia;
  timestamp: Date;
}

interface WatchActivityItemProps extends BaseActivityItemProps {
  type: 'watch';
  seasonNumber?: number;
  episodeNumber?: number;
  watchCount?: number;
}

interface ReviewActivityItemProps extends BaseActivityItemProps {
  type: 'review';
  rating?: number;
  content?: string;
  containsSpoilers?: boolean;
  isPublic?: boolean;
}

export type ActivityItemProps = WatchActivityItemProps | ReviewActivityItemProps;

const ActivityItem = (props: ActivityItemProps) => {
  const intl = useIntl();
  const { media, timestamp, type } = props;

  const mediaUrl = media
    ? `/${media.mediaType === 'movie' ? 'movie' : 'tv'}/${media.tmdbId}`
    : '#';

  const title =
    media?.title ||
    `${media?.mediaType === 'movie' ? 'Movie' : 'TV Show'} #${media?.tmdbId}`;

  const relativeTime = Math.floor(
    (new Date(timestamp).getTime() - Date.now()) / 1000
  );

  return (
    <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-4 text-gray-400 shadow-md ring-1 ring-gray-700 xl:h-28 xl:flex-row">
      {/* Backdrop Image */}
      {media?.backdropPath && (
        <div className="absolute inset-0 z-0 w-full overflow-hidden bg-cover bg-center xl:w-2/3">
          <CachedImage
            type="tmdb"
            src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${media.backdropPath}`}
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
            href={mediaUrl}
            className="relative h-auto w-12 flex-shrink-0 scale-100 transform-gpu overflow-hidden rounded-md transition duration-300 hover:scale-105"
          >
            <CachedImage
              type="tmdb"
              src={
                media?.posterPath
                  ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${media.posterPath}`
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
            <div className="pt-0.5 text-xs font-medium text-white sm:pt-1">
              {type === 'watch'
                ? intl.formatMessage(messages.watched)
                : intl.formatMessage(messages.reviewed)}
            </div>
            <Link
              href={mediaUrl}
              className="mr-2 min-w-0 truncate text-lg font-bold text-white hover:underline xl:text-xl"
            >
              {title}
            </Link>
            {type === 'watch' && media?.mediaType === 'tv' && props.seasonNumber !== undefined && (
              <div className="card-field">
                <span className="text-sm text-gray-400">
                  {intl.formatMessage(messages.season, {
                    season: props.seasonNumber,
                  })}
                  {props.episodeNumber !== undefined &&
                    ` ${intl.formatMessage(messages.episode, {
                      episode: props.episodeNumber,
                    })}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-0">
          {/* Timestamp */}
          <div className="card-field">
            <span className="card-field-name">
              {type === 'watch'
                ? intl.formatMessage(messages.watched)
                : intl.formatMessage(messages.reviewed)}
            </span>
            <span className="flex truncate text-sm text-gray-300">
              <FormattedRelativeTime
                value={relativeTime}
                updateIntervalInSeconds={60}
                numeric="auto"
              />
            </span>
          </div>

          {/* Watch-specific fields */}
          {type === 'watch' && props.watchCount && props.watchCount > 1 && (
            <div className="card-field">
              <Badge badgeType="warning">
                {intl.formatMessage(messages.rewatch, {
                  count: props.watchCount,
                })}
              </Badge>
            </div>
          )}

          {/* Review-specific fields */}
          {type === 'review' && (
            <>
              {props.rating && (
                <div className="card-field">
                  <span className="card-field-name">
                    {intl.formatMessage(messages.rating)}
                  </span>
                  <span className="flex items-center text-sm text-yellow-500">
                    <StarIcon className="mr-1 h-4 w-4" />
                    {props.rating}/10
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                {props.containsSpoilers && (
                  <Badge badgeType="danger">
                    {intl.formatMessage(messages.containsSpoilers)}
                  </Badge>
                )}
                {!props.isPublic && (
                  <Badge badgeType="default">
                    {intl.formatMessage(messages.private)}
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review content preview on the right for larger screens */}
      {type === 'review' && props.content && (
        <div className="z-10 mt-4 flex w-full flex-col justify-center pl-4 pr-4 xl:mt-0 xl:w-96 xl:pl-0">
          <p className="line-clamp-3 text-sm text-gray-300 italic">
            &ldquo;{props.content}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityItem;
