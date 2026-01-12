import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { useState } from 'react';
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
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 py-6">
      <PageTitle title={[intl.formatMessage(messages.title)]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          {intl.formatMessage(messages.title)}
        </h1>
        <p className="mt-2 text-gray-400">
          Explore what the community is watching and reviewing
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('feed')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'feed'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.feed)}
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'leaderboard'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
            }`}
          >
            {intl.formatMessage(messages.leaderboard)}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
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
