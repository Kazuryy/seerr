import Tooltip from '@app/components/Common/Tooltip';
import ReviewModal from '@app/components/ReviewModal';
import { useMyReview } from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { PencilIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { MediaType } from '@server/models/Search';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface ReviewButtonProps {
  mediaId: number;
  mediaType: MediaType;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  onUpdate?: () => void;
}

const messages = defineMessages('components.TrackingButtons', {
  writeReview: 'Write a review',
  editReview: 'Edit your review',
});

const ReviewButton = ({
  mediaId,
  mediaType,
  title,
  seasonNumber,
  episodeNumber,
  onUpdate,
}: ReviewButtonProps) => {
  const intl = useIntl();
  const { user } = useUser();
  const { data: myReview, mutate } = useMyReview(mediaId, seasonNumber);
  const [showModal, setShowModal] = useState(false);

  if (!user) {
    return null;
  }

  const hasReview = !!myReview;

  const handleComplete = () => {
    mutate();
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <>
      <Tooltip
        content={intl.formatMessage(
          hasReview ? messages.editReview : messages.writeReview
        )}
      >
        <button
          onClick={() => setShowModal(true)}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-gray-600"
          aria-label={intl.formatMessage(
            hasReview ? messages.editReview : messages.writeReview
          )}
        >
          {hasReview ? (
            <div className="relative">
              <StarIcon className="h-5 w-5 text-yellow-500" />
              <PencilIcon className="absolute -right-1 -bottom-1 h-3 w-3 text-white" />
            </div>
          ) : (
            <PencilIcon className="h-5 w-5" />
          )}
          {hasReview && myReview.rating && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-gray-900">
              {myReview.rating}
            </span>
          )}
        </button>
      </Tooltip>

      <ReviewModal
        show={showModal}
        mediaId={mediaId}
        mediaType={mediaType}
        title={title}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        onCancel={() => setShowModal(false)}
        onComplete={handleComplete}
      />
    </>
  );
};

export default ReviewButton;
