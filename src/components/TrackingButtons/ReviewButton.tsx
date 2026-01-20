import Button from '@app/components/Common/Button';
import Tooltip from '@app/components/Common/Tooltip';
import ReviewModal from '@app/components/ReviewModal';
import { useMyReview } from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import type { MediaType } from '@server/models/Search';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface ReviewButtonProps {
  mediaId?: number; // Internal media ID (optional, will use tmdbId if not provided)
  tmdbId?: number; // TMDB ID for creating media if not exists
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
  tmdbId,
  mediaType,
  title,
  seasonNumber,
  episodeNumber,
  onUpdate,
}: ReviewButtonProps) => {
  const intl = useIntl();
  const { user } = useUser();
  const { data: myReview, mutate } = useMyReview(
    tmdbId,
    mediaType as 'movie' | 'tv',
    seasonNumber
  );
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
        <Button
          onClick={() => setShowModal(true)}
          className="mr-2"
          buttonType={hasReview ? 'success' : 'ghost'}
        >
          <PencilSquareIcon />
          {hasReview && myReview.rating && (
            <span className="ml-1 text-sm font-bold">{myReview.rating}/10</span>
          )}
        </Button>
      </Tooltip>

      <ReviewModal
        show={showModal}
        mediaId={mediaId}
        tmdbId={tmdbId}
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
