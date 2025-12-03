import Button from '@app/components/Common/Button';
import Modal from '@app/components/Common/Modal';
import Tooltip from '@app/components/Common/Tooltip';
import type { MediaType } from '@app/hooks/useDeletionRequests';
import { createDeletionRequest } from '@app/hooks/useDeletionRequests';
import useSettings from '@app/hooks/useSettings';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import { TrashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages('components.Media.DeletionRequestButton', {
  requestDeletion: 'Request Deletion',
  deletionRequestTitle: 'Request Media Deletion',
  deletionRequestSubtitle: 'Request deletion of "{title}"',
  reasonLabel: 'Reason (optional)',
  reasonPlaceholder: 'Why should this media be deleted?',
  votingInfo: 'Voting Information',
  votingDuration: 'Voting Duration: {hours} hours',
  requiredPercentage: 'Required Approval: {percentage}%',
  autoDelete: 'Auto-delete on approval: {enabled}',
  yes: 'Yes',
  no: 'No',
  cancel: 'Cancel',
  submit: 'Submit Request',
  successMessage: 'Deletion request created successfully!',
  errorMessage: 'Failed to create deletion request.',
  featureDisabled: 'Deletion feature is not enabled.',
  noPermission: 'You do not have permission to request media deletion.',
  requestAlreadyExists: 'A deletion request already exists for this media.',
});

interface DeletionRequestButtonProps {
  mediaId: number;
  mediaType: MediaType;
  title: string;
  onRequestCreated?: () => void;
}

const DeletionRequestButton = ({
  mediaId,
  mediaType,
  title,
  onRequestCreated,
}: DeletionRequestButtonProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const settings = useSettings();
  const { hasPermission } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check if deletion feature is enabled
  if (!settings.currentSettings.deletion?.enabled) {
    return null;
  }

  // Check if user has permission
  const isAdmin = hasPermission(Permission.MANAGE_REQUESTS);
  const allowNonAdmin =
    settings.currentSettings.deletion?.allowNonAdminDeletionRequests || false;

  if (!isAdmin && !allowNonAdmin) {
    return null;
  }

  const handleClick = async () => {
    setIsChecking(true);
    try {
      const response = await axios.get(
        `/api/v1/deletion/check/${mediaId}?mediaType=${mediaType}`
      );

      if (response.data.exists) {
        const requestId = response.data.request?.id;
        addToast(
          <>
            {intl.formatMessage(messages.requestAlreadyExists)}{' '}
            <a
              href={
                requestId
                  ? `/deletion-requests?highlight=${requestId}`
                  : '/deletion-requests'
              }
              className="font-semibold underline"
              onClick={() => {
                window.location.href = requestId
                  ? `/deletion-requests?highlight=${requestId}`
                  : '/deletion-requests';
              }}
            >
              View request
            </a>
          </>,
          {
            appearance: 'info',
            autoDismiss: true,
          }
        );
        return;
      }

      setShowModal(true);
    } catch (error) {
      addToast(intl.formatMessage(messages.errorMessage), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await createDeletionRequest({
        mediaId,
        mediaType,
        reason: reason.trim() || undefined,
      });

      addToast(intl.formatMessage(messages.successMessage), {
        appearance: 'success',
        autoDismiss: true,
      });

      setShowModal(false);
      setReason('');

      if (onRequestCreated) {
        onRequestCreated();
      }
    } catch (error) {
      addToast(intl.formatMessage(messages.errorMessage), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setReason('');
  };

  const votingDurationHours =
    settings.currentSettings.deletion?.votingDurationHours || 48;
  const requiredPercentage =
    settings.currentSettings.deletion?.requiredVotePercentage || 60;
  const autoDelete =
    settings.currentSettings.deletion?.autoDeleteOnApproval || false;

  return (
    <>
      <Tooltip content={intl.formatMessage(messages.requestDeletion)}>
        <Button
          onClick={handleClick}
          className="ml-2 first:ml-0"
          buttonType="danger"
          disabled={isChecking}
        >
          <TrashIcon />
        </Button>
      </Tooltip>

      <Transition
        as="div"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        show={showModal}
      >
        <Modal
          title={intl.formatMessage(messages.deletionRequestTitle)}
          subTitle={intl.formatMessage(messages.deletionRequestSubtitle, {
            title,
          })}
          onCancel={handleCancel}
          onOk={handleSubmit}
          okText={intl.formatMessage(messages.submit)}
          cancelText={intl.formatMessage(messages.cancel)}
          okDisabled={isSubmitting}
          loading={isSubmitting}
        >
          <div className="space-y-4">
            {/* Reason Input */}
            <div>
              <label
                htmlFor="deletion-reason"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                {intl.formatMessage(messages.reasonLabel)}
              </label>
              <textarea
                id="deletion-reason"
                className="block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 transition duration-150 ease-in-out focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm sm:leading-5"
                rows={4}
                maxLength={500}
                placeholder={intl.formatMessage(messages.reasonPlaceholder)}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="mt-1 text-right text-xs text-gray-400">
                {reason.length}/500 characters
              </div>
            </div>

            {/* Voting Information */}
            <div className="rounded-md bg-gray-700 p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-200">
                {intl.formatMessage(messages.votingInfo)}
              </h3>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>
                  {intl.formatMessage(messages.votingDuration, {
                    hours: votingDurationHours,
                  })}
                </li>
                <li>
                  {intl.formatMessage(messages.requiredPercentage, {
                    percentage: requiredPercentage,
                  })}
                </li>
                <li>
                  {intl.formatMessage(messages.autoDelete, {
                    enabled: intl.formatMessage(
                      autoDelete ? messages.yes : messages.no
                    ),
                  })}
                </li>
              </ul>
            </div>
          </div>
        </Modal>
      </Transition>
    </>
  );
};

export default DeletionRequestButton;
