import Modal from '@app/components/Common/Modal';
import { useCreateReview, useMarkAsWatched } from '@app/hooks/useTracking';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import type { MediaType } from '@server/models/Search';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import { mutate } from 'swr';
import RatingInput from './RatingInput';

const messages = defineMessages(
  'components.TrackingButtons.MarkAsWatchedModal',
  {
    title: 'Mark as Watched',
    whenDidYouWatch: 'When did you watch it?',
    justNow: 'Just now',
    customDate: 'Custom date',
    rateThisMedia: 'Rate this {mediaType}? (optional)',
    movie: 'movie',
    tvShow: 'TV show',
    writeReview: 'Write a review',
    goToActivity: 'Go to My Activity after',
    markAsWatched: 'Mark as Watched',
    cancel: 'Cancel',
    watchedSuccess: '<strong>{title}</strong> marked as watched!',
    error: 'Something went wrong. Please try again.',
  }
);

interface MarkAsWatchedModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaType: MediaType;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

const MarkAsWatchedModal = ({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  title = 'this item',
  seasonNumber,
  episodeNumber,
}: MarkAsWatchedModalProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { user } = useUser();
  const { markAsWatched, isLoading: isMarkingWatched } = useMarkAsWatched();
  const { createOrUpdateReview, isLoading: isCreatingReview } =
    useCreateReview();

  const isLoading = isMarkingWatched || isCreatingReview;

  const [dateOption, setDateOption] = useState<'now' | 'custom'>('now');
  const [customDate, setCustomDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [writeReview, setWriteReview] = useState(false);
  const [goToActivity, setGoToActivity] = useState(true);

  if (!user) {
    return null;
  }

  const handleSubmit = async () => {
    try {
      const watchedAt =
        dateOption === 'now' ? new Date() : new Date(customDate);

      // Mark as watched
      await markAsWatched({
        mediaId,
        mediaType: mediaType === 'movie' ? 'movie' : 'tv',
        seasonNumber,
        episodeNumber,
        watchedAt,
      });

      // If rating is provided, create a review
      if (rating) {
        await createOrUpdateReview({
          mediaId,
          mediaType: mediaType === 'movie' ? 'movie' : 'tv',
          seasonNumber,
          rating,
          isPublic: true,
        });
      }

      addToast(
        <span>
          {intl.formatMessage(messages.watchedSuccess, {
            title,
            strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
          })}
        </span>,
        { appearance: 'success', autoDismiss: true }
      );

      // Revalidate relevant data
      mutate(`/api/v1/tracking/watch/${mediaId}`);
      mutate('/api/v1/tracking/watch');
      mutate(
        `/api/v1/tracking/media/${mediaId}/activity?mediaType=${mediaType}`
      );

      onClose();

      // Handle post-submit actions
      if (writeReview) {
        // Redirect to review page with mediaId
        window.location.href = `/activity?tab=reviews&mediaId=${mediaId}&action=new`;
      } else if (goToActivity) {
        // Redirect to activity page
        window.location.href = '/activity?tab=watch';
      }
    } catch (err) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      onCancel={onClose}
      title={intl.formatMessage(messages.title)}
      onOk={handleSubmit}
      okText={intl.formatMessage(messages.markAsWatched)}
      cancelText={intl.formatMessage(messages.cancel)}
      okDisabled={isLoading}
      okButtonType="primary"
    >
      <div className="space-y-6">
        {/* Media Title */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>

        {/* Date Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            {intl.formatMessage(messages.whenDidYouWatch)}
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="dateOption"
                value="now"
                checked={dateOption === 'now'}
                onChange={() => setDateOption('now')}
                className="mr-2 h-4 w-4 border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300">
                {intl.formatMessage(messages.justNow)}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="dateOption"
                value="custom"
                checked={dateOption === 'custom'}
                onChange={() => setDateOption('custom')}
                className="mr-2 h-4 w-4 border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300">
                {intl.formatMessage(messages.customDate)}:
              </span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                disabled={dateOption !== 'custom'}
                max={new Date().toISOString().split('T')[0]}
                className="ml-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700" />

        {/* Rating */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            {intl.formatMessage(messages.rateThisMedia, {
              mediaType: intl.formatMessage(
                mediaType === 'movie' ? messages.movie : messages.tvShow
              ),
            })}
          </label>
          <RatingInput
            value={rating}
            onChange={setRating}
            placeholder="Rating (1-10)"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700" />

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={writeReview}
              onChange={(e) => setWriteReview(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            <span className="ml-2 text-sm text-gray-300">
              {intl.formatMessage(messages.writeReview)}
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={goToActivity}
              onChange={(e) => setGoToActivity(e.target.checked)}
              disabled={writeReview}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-300">
              {intl.formatMessage(messages.goToActivity)}
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default MarkAsWatchedModal;
