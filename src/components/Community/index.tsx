import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import CommunityFeed from './CommunityFeed';
import CommunityStats from './CommunityStats';
import Leaderboard from './Leaderboard';

const messages = defineMessages('components.Community', {
  title: 'Community',
  feed: 'Feed',
  leaderboard: 'Leaderboard',
  stats: 'Stats',
});

type TabType = 'feed' | 'leaderboard' | 'stats';

const CommunityPage = () => {
  const intl = useIntl();
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  // Read tab from URL query parameter
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ['feed', 'leaderboard', 'stats'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [router.query.tab]);

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-2 py-4 sm:px-4 sm:py-6">
      <PageTitle title={[intl.formatMessage(messages.title)]} />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="mt-2 text-sm text-gray-400 sm:text-base">
          Explore what the community is watching and reviewing
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-700 sm:mb-6">
        <nav className="-mb-px flex space-x-4 overflow-x-auto sm:space-x-8">
          <button
            onClick={() => setActiveTab('feed')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'feed'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.feed)}
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'leaderboard'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.leaderboard)}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-xs font-medium sm:py-4 sm:text-sm ${
              activeTab === 'stats'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.stats)}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'feed' && <CommunityFeed />}
      {activeTab === 'leaderboard' && <Leaderboard />}
      {activeTab === 'stats' && <CommunityStats />}
    </div>
  );
};

export default CommunityPage;
