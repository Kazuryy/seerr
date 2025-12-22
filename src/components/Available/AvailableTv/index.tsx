import Header from '@app/components/Common/Header';
import ListView from '@app/components/Common/ListView';
import PageTitle from '@app/components/Common/PageTitle';
import useDiscover from '@app/hooks/useDiscover';
import { useUpdateQueryParams } from '@app/hooks/useUpdateQueryParams';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import { BarsArrowDownIcon } from '@heroicons/react/24/solid';
import type { TvResult } from '@server/models/Search';
import { useRouter } from 'next/router';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Available.AvailableTv', {
  availabletv: 'Available TV Shows',
  sortPopularityDesc: 'Popularity',
  sortFirstAirDateDesc: 'First Air Date',
  sortMediaAddedDesc: 'Recently Added',
  sortTmdbRatingDesc: 'TMDB Rating',
  sortTitleAsc: 'Title (A-Z)',
});

const SortOptions = {
  MediaAdded: 'mediaAddedAt',
  Popularity: 'popularity',
  FirstAirDate: 'releaseDate',
  Rating: 'rating',
  Title: 'title',
} as const;

const AvailableTv = () => {
  const intl = useIntl();
  const router = useRouter();
  const updateQueryParams = useUpdateQueryParams(router.query);

  const {
    isLoadingInitialData,
    isEmpty,
    isLoadingMore,
    isReachingEnd,
    titles,
    fetchMore,
    error,
  } = useDiscover<TvResult>('/api/v1/available/movies', {
    ...router.query,
    type: 'tv',
  });

  if (error) {
    return <Error statusCode={500} />;
  }

  const title = intl.formatMessage(messages.availabletv);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-end">
        <Header>{title}</Header>
        <div className="mt-2 flex flex-grow flex-col sm:flex-row lg:flex-grow-0">
          <div className="mb-2 flex flex-grow sm:mb-0 sm:mr-2 lg:flex-grow-0">
            <span className="inline-flex cursor-default items-center rounded-l-md border border-r-0 border-gray-500 bg-gray-800 px-3 text-gray-100 sm:text-sm">
              <BarsArrowDownIcon className="h-6 w-6" />
            </span>
            <select
              id="sortBy"
              name="sortBy"
              className="rounded-r-only"
              value={(router.query.sortBy as string) || 'mediaAddedAt'}
              onChange={(e) => updateQueryParams('sortBy', e.target.value)}
            >
              <option value={SortOptions.MediaAdded}>
                {intl.formatMessage(messages.sortMediaAddedDesc)}
              </option>
              <option value={SortOptions.Popularity}>
                {intl.formatMessage(messages.sortPopularityDesc)}
              </option>
              <option value={SortOptions.FirstAirDate}>
                {intl.formatMessage(messages.sortFirstAirDateDesc)}
              </option>
              <option value={SortOptions.Rating}>
                {intl.formatMessage(messages.sortTmdbRatingDesc)}
              </option>
              <option value={SortOptions.Title}>
                {intl.formatMessage(messages.sortTitleAsc)}
              </option>
            </select>
          </div>
        </div>
      </div>
      <ListView
        items={titles}
        isEmpty={isEmpty}
        isLoading={
          isLoadingInitialData || (isLoadingMore && (titles?.length ?? 0) > 0)
        }
        isReachingEnd={isReachingEnd}
        onScrollBottom={fetchMore}
      />
    </>
  );
};

export default AvailableTv;
