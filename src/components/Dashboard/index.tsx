import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';
import ActivityChart from './ActivityChart';
import BadgesWidget from './BadgesWidget';
import CommunityFeedWidget from './CommunityFeedWidget';
import DashboardStats from './DashboardStats';
import LeaderboardWidget from './LeaderboardWidget';
import QuickLinks from './QuickLinks';
import StreakWidget from './StreakWidget';
import TrendingWidget from './TrendingWidget';
import WatchTimeWidget from './WatchTimeWidget';

const messages = defineMessages('components.Dashboard', {
  title: 'Dashboard',
  subtitle: 'Your activity and community highlights',
});

const Dashboard = () => {
  const intl = useIntl();
  const { user } = useUser();

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-2 py-4 sm:px-4 sm:py-6">
      <PageTitle title={[intl.formatMessage(messages.title)]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {intl.formatMessage(messages.subtitle)}
        </p>
      </div>

      {/* Stats Cards Row */}
      <DashboardStats userId={user.id} />

      {/* Main Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Activity Chart */}
          <ActivityChart userId={user.id} />

          {/* Trending This Week */}
          <TrendingWidget />

          {/* Community Feed */}
          <CommunityFeedWidget />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Watch Time & Streak Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <WatchTimeWidget userId={user.id} />
            <StreakWidget userId={user.id} />
          </div>

          {/* Quick Links */}
          <QuickLinks />

          {/* Leaderboard */}
          <LeaderboardWidget />

          {/* Badges */}
          <BadgesWidget userId={user.id} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
