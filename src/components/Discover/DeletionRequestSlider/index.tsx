import { sliderTitles } from '@app/components/Discover/constants';
import DeletionSliderCard from '@app/components/Discover/DeletionRequestSlider/DeletionSliderCard';
import Slider from '@app/components/Slider';
import {
  DeletionRequestStatus,
  useDeletionRequests,
} from '@app/hooks/useDeletionRequests';
import useSettings from '@app/hooks/useSettings';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const DeletionRequestSlider = () => {
  const intl = useIntl();
  const settings = useSettings();

  const { data, mutate, isLoading } = useDeletionRequests({
    pageSize: 20,
    status: DeletionRequestStatus.VOTING,
  });

  // Don't show if deletion feature is disabled
  if (!settings.currentSettings.deletion?.enabled) {
    return null;
  }

  // Don't show while loading or if no voting requests
  if (isLoading || !data || data.results.length === 0) {
    return null;
  }

  return (
    <>
      <div className="slider-header">
        <Link href="/deletion-requests?filter=voting" className="slider-title">
          <span>{intl.formatMessage(sliderTitles.votingnow)}</span>
          <ArrowRightCircleIcon />
        </Link>
      </div>
      <Slider
        sliderKey="deletion-requests"
        isLoading={!data}
        items={(data?.results ?? []).map((request) => (
          <DeletionSliderCard
            key={`deletion-slider-${request.id}`}
            request={request}
            onVoteUpdate={() => mutate()}
          />
        ))}
        placeholder={<DeletionSliderCard.Placeholder />}
      />
    </>
  );
};

export default DeletionRequestSlider;
