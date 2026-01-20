import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import {
  ChartBarIcon,
  ClockIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.QuickLinks', {
  quickLinks: 'Quick Links',
  myActivity: 'My Activity',
  myActivityDesc: 'View your watch history and stats',
  myReviews: 'My Reviews',
  myReviewsDesc: 'Manage your reviews',
  communityFeed: 'Community Feed',
  communityFeedDesc: 'See what others are watching',
  leaderboard: 'Leaderboard',
  leaderboardDesc: 'Top community contributors',
});

const QuickLinks = () => {
  const intl = useIntl();
  const { user } = useUser();

  const links = [
    {
      href: `/users/${user?.id}/activity`,
      icon: ClockIcon,
      label: messages.myActivity,
      description: messages.myActivityDesc,
      color: 'text-blue-500',
    },
    {
      href: `/users/${user?.id}/activity?tab=reviews`,
      icon: PencilSquareIcon,
      label: messages.myReviews,
      description: messages.myReviewsDesc,
      color: 'text-green-500',
    },
    {
      href: '/community',
      icon: UserGroupIcon,
      label: messages.communityFeed,
      description: messages.communityFeedDesc,
      color: 'text-purple-500',
    },
    {
      href: '/community?tab=leaderboard',
      icon: ChartBarIcon,
      label: messages.leaderboard,
      description: messages.leaderboardDesc,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">
        {intl.formatMessage(messages.quickLinks)}
      </h3>
      <div className="space-y-2">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className="flex items-center rounded-md bg-gray-700/50 p-3 transition-colors hover:bg-gray-700"
          >
            <link.icon className={`mr-3 h-5 w-5 ${link.color}`} />
            <div>
              <p className="text-sm font-medium text-white">
                {intl.formatMessage(link.label)}
              </p>
              <p className="text-xs text-gray-400">
                {intl.formatMessage(link.description)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickLinks;
