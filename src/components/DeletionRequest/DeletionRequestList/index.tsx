import Button from '@app/components/Common/Button';
import Header from '@app/components/Common/Header';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import DeletionRequestCard from '@app/components/DeletionRequest/DeletionRequestCard';
import {
  DeletionRequestStatus,
  useDeletionRequests,
} from '@app/hooks/useDeletionRequests';
import { useUpdateQueryParams } from '@app/hooks/useUpdateQueryParams';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages(
  'components.DeletionRequest.DeletionRequestList',
  {
    deletionRequests: 'Removals',
    showAllRequests: 'Show All Requests',
  }
);

type StatusFilter = DeletionRequestStatus | 'all';

const DeletionRequestList = () => {
  const router = useRouter();
  const intl = useIntl();
  const [currentFilter, setCurrentFilter] = useState<StatusFilter>('all');
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);

  const page = router.query.page ? Number(router.query.page) : 1;
  const pageIndex = page - 1;
  const updateQueryParams = useUpdateQueryParams({ page: page.toString() });

  const {
    data,
    isLoading,
    mutate: revalidate,
  } = useDeletionRequests({
    page,
    pageSize: currentPageSize,
    status: currentFilter === 'all' ? undefined : currentFilter,
  });

  // Restore last set filter values on component mount
  useEffect(() => {
    const filterString = window.localStorage.getItem('drl-filter-settings');

    if (filterString) {
      const filterSettings = JSON.parse(filterString);
      setCurrentFilter(filterSettings.currentFilter);
      setCurrentPageSize(filterSettings.currentPageSize);
    }

    // If filter value is provided in query, use that instead
    const validFilters: StatusFilter[] = [
      'all',
      DeletionRequestStatus.PENDING,
      DeletionRequestStatus.VOTING,
      DeletionRequestStatus.APPROVED,
      DeletionRequestStatus.REJECTED,
      DeletionRequestStatus.COMPLETED,
      DeletionRequestStatus.CANCELLED,
    ];
    if (validFilters.includes(router.query.filter as StatusFilter)) {
      setCurrentFilter(router.query.filter as StatusFilter);
    }
  }, [router.query.filter]);

  // Set filter values to local storage any time they are changed
  useEffect(() => {
    window.localStorage.setItem(
      'drl-filter-settings',
      JSON.stringify({
        currentFilter,
        currentPageSize,
      })
    );
  }, [currentFilter, currentPageSize]);

  if (isLoading && !data) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  const hasNextPage = data.pageInfo.pages > pageIndex + 1;
  const hasPrevPage = pageIndex > 0;

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.deletionRequests)} />
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-end">
        <Header>{intl.formatMessage(messages.deletionRequests)}</Header>
        <div className="mt-2 flex flex-grow flex-col sm:flex-row lg:flex-grow-0">
          <div className="mb-2 flex flex-grow sm:mb-0 lg:flex-grow-0">
            <span className="inline-flex cursor-default items-center rounded-l-md border border-r-0 border-gray-500 bg-gray-800 px-3 text-sm text-gray-100">
              <FunnelIcon className="h-6 w-6" />
            </span>
            <select
              id="filter"
              name="filter"
              onChange={(e) => {
                setCurrentFilter(e.target.value as StatusFilter);
                router.push({
                  pathname: router.pathname,
                  query: {},
                });
              }}
              value={currentFilter}
              className="rounded-r-only"
            >
              <option value="all">
                {intl.formatMessage(globalMessages.all)}
              </option>
              <option value={DeletionRequestStatus.VOTING}>
                {intl.formatMessage(globalMessages.voting)}
              </option>
              <option value={DeletionRequestStatus.APPROVED}>
                {intl.formatMessage(globalMessages.approved)}
              </option>
              <option value={DeletionRequestStatus.REJECTED}>
                {intl.formatMessage(globalMessages.rejected)}
              </option>
              <option value={DeletionRequestStatus.COMPLETED}>
                {intl.formatMessage(globalMessages.completed)}
              </option>
              <option value={DeletionRequestStatus.CANCELLED}>
                {intl.formatMessage(globalMessages.cancelled)}
              </option>
            </select>
          </div>
        </div>
      </div>

      {data.results.map((request) => {
        return (
          <div className="py-2" key={`deletion-request-${request.id}`}>
            <DeletionRequestCard
              request={request}
              onVote={() => revalidate()}
            />
          </div>
        );
      })}

      {data.results.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center py-24 text-white">
          <span className="text-2xl text-gray-400">
            {intl.formatMessage(globalMessages.noresults)}
          </span>
          {currentFilter !== 'all' && (
            <div className="mt-4">
              <Button
                buttonType="primary"
                onClick={() => {
                  setCurrentFilter('all');
                }}
              >
                {intl.formatMessage(messages.showAllRequests)}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="actions">
        <nav
          className="mb-3 flex flex-col items-center space-y-3 sm:flex-row sm:space-y-0"
          aria-label="Pagination"
        >
          <div className="hidden lg:flex lg:flex-1">
            <p className="text-sm">
              {data.results.length > 0 &&
                intl.formatMessage(globalMessages.showingresults, {
                  from: pageIndex * currentPageSize + 1,
                  to:
                    data.results.length < currentPageSize
                      ? pageIndex * currentPageSize + data.results.length
                      : (pageIndex + 1) * currentPageSize,
                  total: data.pageInfo.results,
                  strong: (msg: React.ReactNode) => (
                    <span className="font-medium">{msg}</span>
                  ),
                })}
            </p>
          </div>
          <div className="flex justify-center sm:flex-1 sm:justify-start lg:justify-center">
            <span className="-mt-3 items-center truncate text-sm sm:mt-0">
              {intl.formatMessage(globalMessages.resultsperpage, {
                pageSize: (
                  <select
                    id="pageSize"
                    name="pageSize"
                    onChange={(e) => {
                      setCurrentPageSize(Number(e.target.value));
                      router
                        .push({
                          pathname: router.pathname,
                          query: {},
                        })
                        .then(() => window.scrollTo(0, 0));
                    }}
                    value={currentPageSize}
                    className="short inline"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                ),
              })}
            </span>
          </div>
          <div className="flex flex-auto justify-center space-x-2 sm:flex-1 sm:justify-end">
            <Button
              disabled={!hasPrevPage}
              onClick={() => updateQueryParams('page', (page - 1).toString())}
            >
              <ChevronLeftIcon />
              <span>{intl.formatMessage(globalMessages.previous)}</span>
            </Button>
            <Button
              disabled={!hasNextPage}
              onClick={() => updateQueryParams('page', (page + 1).toString())}
            >
              <span>{intl.formatMessage(globalMessages.next)}</span>
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default DeletionRequestList;
