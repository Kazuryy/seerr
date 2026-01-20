import Modal from '@app/components/Common/Modal';
import RatingInput from '@app/components/TrackingButtons/RatingInput';
import { useCreateReview, useMyReview } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import type { MediaType } from '@server/models/Search';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

interface ReviewModalProps {
  show: boolean;
  mediaId?: number; // Internal media ID (optional)
  tmdbId?: number; // TMDB ID for creating media if not exists
  mediaType: MediaType;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  onCancel: () => void;
  onComplete?: () => void;
}

const messages = defineMessages('components.ReviewModal', {
  title: 'Write a Review',
  editTitle: 'Edit Review',
  rating: 'Rating (1-10)',
  ratingOptional: 'Optional',
  content: 'Review Text',
  contentPlaceholder: 'Share your thoughts...',
  containsSpoilers: 'Contains spoilers',
  isPublic: 'Make public',
  submit: 'Submit Review',
  update: 'Update Review',
  submitting: 'Submitting...',
  success: 'Review submitted successfully!',
  updateSuccess: 'Review updated successfully!',
  error: 'Failed to submit review. Please try again.',
  validationError: 'Please provide at least a rating or review text.',
});

const ReviewModal = ({
  show,
  mediaId,
  tmdbId,
  mediaType,
  title = '',
  seasonNumber,
  episodeNumber,
  onCancel,
  onComplete,
}: ReviewModalProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { data: existingReview } = useMyReview(
    tmdbId,
    mediaType as 'movie' | 'tv',
    seasonNumber
  );
  const { createOrUpdateReview, isLoading } = useCreateReview();

  const [rating, setRating] = useState<number | undefined>(undefined);
  const [content, setContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const isEditing = !!existingReview;

  // Load existing review data when modal opens
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setContent(existingReview.content ?? '');
      setContainsSpoilers(existingReview.containsSpoilers);
      setIsPublic(existingReview.isPublic);
    } else {
      // Reset form for new review
      setRating(undefined);
      setContent('');
      setContainsSpoilers(false);
      setIsPublic(true);
    }
  }, [existingReview, show]);

  const handleSubmit = async () => {
    // Validation: must have at least rating OR content
    if (!rating && !content.trim()) {
      addToast(intl.formatMessage(messages.validationError), {
        appearance: 'error',
        autoDismiss: true,
      });
      return;
    }

    try {
      await createOrUpdateReview({
        ...(mediaId ? { mediaId } : {}),
        tmdbId,
        mediaType: mediaType === 'movie' ? 'movie' : 'tv',
        seasonNumber,
        episodeNumber,
        rating,
        content: content.trim() || undefined,
        containsSpoilers,
        isPublic,
      });

      addToast(
        intl.formatMessage(
          isEditing ? messages.updateSuccess : messages.success
        ),
        { appearance: 'success', autoDismiss: true }
      );

      if (onComplete) {
        onComplete();
      }

      onCancel();
    } catch (err) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  };

  return (
    <Transition
      as="div"
      enter="transition-opacity duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={show}
    >
      <Modal
        title={intl.formatMessage(
          isEditing ? messages.editTitle : messages.title
        )}
        subTitle={title}
        onCancel={onCancel}
        onOk={handleSubmit}
        okText={intl.formatMessage(
          isEditing ? messages.update : messages.submit
        )}
        okDisabled={isLoading}
        loading={isLoading}
      >
        <div className="space-y-6">
          {/* Rating */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              {intl.formatMessage(messages.rating)}{' '}
              <span className="text-xs text-gray-400">
                ({intl.formatMessage(messages.ratingOptional)})
              </span>
            </label>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          {/* Review Content */}
          <div>
            <label
              htmlFor="review-content"
              className="mb-2 block text-sm font-medium text-gray-200"
            >
              {intl.formatMessage(messages.content)}{' '}
              <span className="text-xs text-gray-400">
                ({intl.formatMessage(messages.ratingOptional)})
              </span>
            </label>
            <textarea
              id="review-content"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={intl.formatMessage(messages.contentPlaceholder)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Spoilers Checkbox */}
          <div className="flex items-center">
            <input
              id="contains-spoilers"
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            />
            <label
              htmlFor="contains-spoilers"
              className="ml-2 text-sm text-gray-200"
            >
              {intl.formatMessage(messages.containsSpoilers)}
            </label>
          </div>

          {/* Public Checkbox */}
          <div className="flex items-center">
            <input
              id="is-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            />
            <label htmlFor="is-public" className="ml-2 text-sm text-gray-200">
              {intl.formatMessage(messages.isPublic)}
            </label>
          </div>
        </div>
      </Modal>
    </Transition>
  );
};

export default ReviewModal;
