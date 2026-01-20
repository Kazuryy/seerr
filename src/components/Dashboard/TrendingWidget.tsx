import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import Slider from '@app/components/Slider';
import StatsTitleCard from '@app/components/Community/StatsTitleCard';
import { useCommunityStats } from '@app/hooks/useCommunity';
import defineMessages from '@app/utils/defineMessages';
import { FireIcon, StarIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Dashboard.TrendingWidget', {
  trendingThisWeek: 'Trending This Week',
  topRatedThisMonth: 'Top Rated This Month',
  noData: 'No data yet',
});

const TrendingWidget = () => {
  const intl = useIntl();
  const { data, isLoading } = useCommunityStats();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Most Watched This Week */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-4 flex items-center">
          <FireIcon className="mr-2 h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-white">
            {intl.formatMessage(messages.trendingThisWeek)}
          </h3>
        </div>
        {data.mostWatchedThisWeek.length > 0 ? (
          <Slider
            sliderKey="dashboard-trending"
            isLoading={false}
            isEmpty={false}
            items={data.mostWatchedThisWeek.slice(0, 10).map((item) => (
              <StatsTitleCard
                key={item.tmdbId}
                id={item.id}
                tmdbId={item.tmdbId}
                type={item.mediaType}
                watchCount={item.watchCount}
              />
            ))}
          />
        ) : (
          <p className="text-sm text-gray-400">
            {intl.formatMessage(messages.noData)}
          </p>
        )}
      </div>

      {/* Top Rated This Month */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-4 flex items-center">
          <StarIcon className="mr-2 h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">
            {intl.formatMessage(messages.topRatedThisMonth)}
          </h3>
        </div>
        {data.topRatedThisMonth.length > 0 ? (
          <Slider
            sliderKey="dashboard-top-rated"
            isLoading={false}
            isEmpty={false}
            items={data.topRatedThisMonth.slice(0, 10).map((item) => (
              <StatsTitleCard
                key={item.tmdbId}
                id={item.id}
                tmdbId={item.tmdbId}
                type={item.mediaType}
                averageRating={item.averageRating}
                reviewCount={item.reviewCount}
              />
            ))}
          />
        ) : (
          <p className="text-sm text-gray-400">
            {intl.formatMessage(messages.noData)}
          </p>
        )}
      </div>
    </div>
  );
};

export default TrendingWidget;
