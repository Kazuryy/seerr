import Button from '@app/components/Common/Button';
import Modal from '@app/components/Common/Modal';
import { useBatchMarkAsWatched } from '@app/hooks/useTracking';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages('components.TvDetails.BatchMarkSeasonButton', {
  markSeasonAsWatched: 'Mark Season as Watched',
  confirmTitle: 'Mark Season {seasonNumber} as Watched?',
  confirmMessage:
    'This will mark all {episodeCount} episodes of Season {seasonNumber} as watched. This action cannot be undone.',
  cancel: 'Cancel',
  confirm: 'Mark as Watched',
  success: 'Season {seasonNumber} marked as watched!',
  error: 'Failed to mark season as watched',
  marking: 'Marking...',
});

interface BatchMarkSeasonButtonProps {
  mediaId: number;
  seasonNumber: number;
  episodeCount: number;
  onUpdate?: () => void;
}

const BatchMarkSeasonButton = ({
  mediaId,
  seasonNumber,
  episodeCount,
  onUpdate,
}: BatchMarkSeasonButtonProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { batchMarkAsWatched } = useBatchMarkAsWatched();
  const [showModal, setShowModal] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleConfirm = async () => {
    setIsMarking(true);

    try {
      // Generate array of episode numbers [1, 2, 3, ..., episodeCount]
      const episodeNumbers = Array.from(
        { length: episodeCount },
        (_, i) => i + 1
      );

      await batchMarkAsWatched({
        mediaId,
        seasonNumber,
        episodeNumbers,
      });

      addToast(intl.formatMessage(messages.success, { seasonNumber }), {
        appearance: 'success',
        autoDismiss: true,
      });

      setShowModal(false);
      onUpdate?.();
    } catch (error) {
      addToast(intl.formatMessage(messages.error), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <>
      <Button
        buttonType="ghost"
        buttonSize="sm"
        onClick={() => setShowModal(true)}
        className="!p-1.5"
      >
        <CheckCircleIcon className="h-4 w-4" />
        <span className="ml-1.5 text-xs">
          {intl.formatMessage(messages.markSeasonAsWatched)}
        </span>
      </Button>

      <Transition
        show={showModal}
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Modal
          title={intl.formatMessage(messages.confirmTitle, { seasonNumber })}
          onCancel={() => setShowModal(false)}
          onOk={handleConfirm}
          okText={
            isMarking
              ? intl.formatMessage(messages.marking)
              : intl.formatMessage(messages.confirm)
          }
          cancelText={intl.formatMessage(messages.cancel)}
          okDisabled={isMarking}
          okButtonType="primary"
        >
          <p className="text-sm text-gray-300">
            {intl.formatMessage(messages.confirmMessage, {
              seasonNumber,
              episodeCount,
            })}
          </p>
        </Modal>
      </Transition>
    </>
  );
};

export default BatchMarkSeasonButton;
