import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import { useUserBadges } from '@app/hooks/useBadges';
import type { User } from '@app/hooks/useUser';
import { Permission, useUser } from '@app/hooks/useUser';
import { useUserStats, useWatchTime } from '@app/hooks/useUserStats';
import defineMessages from '@app/utils/defineMessages';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CogIcon,
  FilmIcon,
  TvIcon,
  UserIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.UserProfile.ProfileHeader', {
  settings: 'Edit Settings',
  profile: 'View Profile',
  joindate: 'Joined {joindate}',
  userid: 'User ID: {userid}',
  movies: 'Movies',
  episodes: 'Episodes',
  watchTime: 'Watch Time',
  reviews: 'Reviews',
});

interface ProfileHeaderProps {
  user: User;
  isSettingsPage?: boolean;
}

const ProfileHeader = ({ user, isSettingsPage }: ProfileHeaderProps) => {
  const intl = useIntl();
  const { user: loggedInUser, hasPermission } = useUser();
  const { data: userStats } = useUserStats(user.id);
  const { data: watchTime } = useWatchTime(user.id);
  const { badges: userBadges } = useUserBadges(user.id);

  const subtextItems: React.ReactNode[] = [
    intl.formatMessage(messages.joindate, {
      joindate: intl.formatDate(user.createdAt, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }),
  ];

  if (hasPermission(Permission.MANAGE_REQUESTS)) {
    subtextItems.push(intl.formatMessage(messages.userid, { userid: user.id }));
  }

  // Format watch time display
  const formatWatchTime = () => {
    if (!watchTime) return '0h';
    const { breakdown } = watchTime;
    if (breakdown.years > 0) {
      return `${breakdown.years}y ${breakdown.months}mo`;
    }
    if (breakdown.months > 0) {
      return `${breakdown.months}mo ${breakdown.days}d`;
    }
    if (breakdown.days > 0) {
      return `${breakdown.days}d ${breakdown.hours}h`;
    }
    if (breakdown.hours > 0) {
      return `${breakdown.hours}h ${breakdown.minutes}m`;
    }
    return `${breakdown.minutes}m`;
  };

  // Get earned badges
  const earnedBadges = userBadges || [];

  return (
    <div className="relative z-40 mt-6 mb-8">
      {/* Main Header Row */}
      <div className="lg:flex lg:items-end lg:justify-between lg:space-x-5">
        <div className="flex items-end justify-items-end space-x-5">
          <div className="flex-shrink-0">
            <div className="relative">
              <CachedImage
                type="avatar"
                className="h-24 w-24 rounded-full bg-gray-600 object-cover ring-1 ring-gray-700"
                src={user.avatar}
                alt=""
                width={96}
                height={96}
              />
              <span
                className="absolute inset-0 rounded-full shadow-inner"
                aria-hidden="true"
              ></span>
            </div>
          </div>
          <div className="pt-1.5">
            <h1 className="mb-1 flex flex-col sm:flex-row sm:items-center">
              <Link
                href={
                  user.id === loggedInUser?.id ? '/profile' : `/users/${user.id}`
                }
                className="text-overseerr text-lg font-bold hover:to-purple-200 sm:text-2xl"
              >
                {user.displayName}
              </Link>
              {user.email && user.displayName.toLowerCase() !== user.email && (
                <span className="text-sm text-gray-400 sm:ml-2 sm:text-lg">
                  ({user.email})
                </span>
              )}
            </h1>
            <p className="text-sm font-medium text-gray-400">
              {subtextItems.reduce((prev, curr) => (
                <>
                  {prev} | {curr}
                </>
              ))}
            </p>
          </div>
        </div>
        <div className="justify-stretch mt-6 flex flex-col-reverse space-y-4 space-y-reverse lg:flex-row lg:justify-end lg:space-y-0 lg:space-x-3 lg:space-x-reverse">
          {(loggedInUser?.id === user.id ||
            (user.id !== 1 && hasPermission(Permission.MANAGE_USERS))) &&
          !isSettingsPage ? (
            <Link
              href={
                loggedInUser?.id === user.id
                  ? `/profile/settings`
                  : `/users/${user.id}/settings`
              }
              passHref
              legacyBehavior
            >
              <Button as="a">
                <CogIcon />
                <span>{intl.formatMessage(messages.settings)}</span>
              </Button>
            </Link>
          ) : (
            isSettingsPage && (
              <Link
                href={
                  loggedInUser?.id === user.id ? `/profile` : `/users/${user.id}`
                }
                passHref
                legacyBehavior
              >
                <Button as="a">
                  <UserIcon />
                  <span>{intl.formatMessage(messages.profile)}</span>
                </Button>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Stats Row */}
      {!isSettingsPage && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Stats Labels */}
          <StatLabel
            icon={<FilmIcon className="h-4 w-4" />}
            label={intl.formatMessage(messages.movies)}
            value={userStats?.watchStats?.movieWatches || 0}
            color="blue"
          />
          <StatLabel
            icon={<TvIcon className="h-4 w-4" />}
            label={intl.formatMessage(messages.episodes)}
            value={userStats?.watchStats?.episodeWatches || 0}
            color="purple"
          />
          <StatLabel
            icon={<ClockIcon className="h-4 w-4" />}
            label={intl.formatMessage(messages.watchTime)}
            value={formatWatchTime()}
            color="green"
          />
          <StatLabel
            icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
            label={intl.formatMessage(messages.reviews)}
            value={userStats?.reviewStats?.totalReviews || 0}
            color="yellow"
          />

          {/* Divider */}
          {earnedBadges.length > 0 && (
            <div className="mx-2 h-6 w-px bg-gray-700" />
          )}

          {/* Badges as Labels */}
          {earnedBadges.slice(0, 5).map((badge) => (
            <div
              key={badge.id}
              className="group relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-3 py-1.5 text-sm font-medium text-indigo-300 ring-1 ring-indigo-500/50"
              title={badge.description}
            >
              <span className="text-base">{badge.icon}</span>
              <span>{badge.displayName}</span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl group-hover:block">
                <div className="font-semibold">{badge.displayName}</div>
                <div className="text-xs text-gray-300">{badge.description}</div>
                <div className="absolute left-1/2 top-full -translate-x-1/2">
                  <div className="border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          ))}
          {earnedBadges.length > 5 && (
            <span className="text-sm text-gray-400">
              +{earnedBadges.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Label Component
const StatLabel = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'blue' | 'purple' | 'green' | 'yellow';
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 ring-blue-500/50',
    purple: 'bg-purple-500/20 text-purple-400 ring-purple-500/50',
    green: 'bg-green-500/20 text-green-400 ring-green-500/50',
    yellow: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/50',
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${colorClasses[color]}`}
    >
      {icon}
      <span className="text-gray-300">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
};

export default ProfileHeader;
