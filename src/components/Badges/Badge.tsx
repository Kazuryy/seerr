import type { BadgeDefinition } from '@app/hooks/useBadges';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Badges.Badge', {
  earnedOn: 'Earned on {date}',
  locked: 'Locked',
});

interface BadgeProps {
  badge: BadgeDefinition;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
}

// Category color mapping
const categoryColors: Record<
  BadgeDefinition['category'],
  { bg: string; text: string; ring: string; locked: string }
> = {
  watching: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    ring: 'ring-blue-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
  reviews: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    ring: 'ring-yellow-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
  social: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    ring: 'ring-pink-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
  streaks: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    ring: 'ring-orange-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
  special: {
    bg: 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20',
    text: 'text-indigo-300',
    ring: 'ring-indigo-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
  community: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    ring: 'ring-green-500/50',
    locked: 'bg-gray-700/30 text-gray-500 ring-gray-600/50',
  },
};

const Badge = ({ badge, earnedAt, size = 'md', locked = false }: BadgeProps) => {
  const intl = useIntl();

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const colors = categoryColors[badge.category] || categoryColors.special;

  return (
    <div
      className={`group relative flex items-center rounded-full font-medium ring-1 transition-all ${sizeClasses[size]} ${
        locked
          ? colors.locked
          : `${colors.bg} ${colors.text} ${colors.ring} hover:scale-105`
      }`}
      title={badge.description}
    >
      {/* Icon */}
      <span className={`${iconSizes[size]} ${locked ? 'grayscale opacity-50' : ''}`}>
        {badge.icon}
      </span>

      {/* Name */}
      <span className={locked ? 'text-gray-500' : ''}>{badge.displayName}</span>

      {/* Tooltip on Hover */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl group-hover:block">
        <div className="font-semibold">{badge.displayName}</div>
        <div className="text-xs text-gray-300">{badge.description}</div>
        {earnedAt && !locked && (
          <div className="mt-1 text-xs text-gray-400">
            {intl.formatMessage(messages.earnedOn, {
              date: new Date(earnedAt).toLocaleDateString(),
            })}
          </div>
        )}
        {locked && (
          <div className="mt-1 text-xs text-gray-500">
            {intl.formatMessage(messages.locked)}
          </div>
        )}
        <div className="absolute left-1/2 top-full -translate-x-1/2">
          <div className="border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
};

export default Badge;
