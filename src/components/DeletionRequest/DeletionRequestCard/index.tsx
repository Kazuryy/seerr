import Badge from '@app/components/Common/Badge';
import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import ConfirmButton from '@app/components/Common/ConfirmButton';
import {
  cancelDeletionRequest,
  DeletionRequestStatus,
  executeMediaDeletion,
  MediaType,
  removeVote,
  useUserVote,
  voteOnDeletion,
} from '@app/hooks/useDeletionRequests';
import { Permission, useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';
import type { DeletionRequestResult } from '@server/interfaces/api/deletionInterfaces';
import Link from 'next/link';
import { useState } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages(
  'components.DeletionRequest.DeletionRequestCard',
  {
    votesFor: '{count} for',
    votesAgainst: '{count} against',
    approvalPercentage: '{percentage}%',
    voteKeep: 'Keep',
    voteRemove: 'Remove',
    removeVote: 'Remove Vote',
    executeDeletion: 'Execute Deletion',
    cancelRequest: 'Cancel Request',
    reason: 'Reason:',
    voteSuccess: 'Vote submitted successfully',
    voteError: 'Failed to submit vote',
    removeVoteSuccess: 'Vote removed',
    removeVoteError: 'Failed to remove vote',
    executeSuccess: 'Media deletion executed successfully',
    executeError: 'Failed to execute deletion',
    cancelSuccess: 'Deletion request cancelled successfully',
    cancelError: 'Failed to cancel request',
    requested: 'Requested',
    votingEnds: 'Voting ends',
    votingEnded: 'Voting ended',
    youVotedKeep: 'You voted to keep',
    youVotedRemove: 'You voted to remove',
  }
);

interface DeletionRequestCardProps {
  request: DeletionRequestResult;
  onVote?: () => void;
}

const DeletionRequestCard = ({ request, onVote }: DeletionRequestCardProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const { user, hasPermission } = useUser();
  const { vote: userVote, mutate: revalidateVote } = useUserVote(request.id);
  const [isVoting, setIsVoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isAdmin = hasPermission(Permission.MANAGE_REQUESTS);
  const isRequester = request.requestedBy.id === user?.id;
  const canCancel =
    (isRequester || isAdmin) &&
    (request.status === DeletionRequestStatus.PENDING ||
      request.status === DeletionRequestStatus.VOTING);
  const canExecute =
    isAdmin && request.status === DeletionRequestStatus.APPROVED;

  const handleVote = async (vote: boolean) => {
    setIsVoting(true);
    try {
      await voteOnDeletion(request.id, vote);
      addToast(intl.formatMessage(messages.voteSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      revalidateVote();
      if (onVote) onVote();
    } catch (error) {
      addToast(intl.formatMessage(messages.voteError), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleRemoveVote = async () => {
    setIsVoting(true);
    try {
      await removeVote(request.id);
      addToast(intl.formatMessage(messages.removeVoteSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      revalidateVote();
      if (onVote) onVote();
    } catch (error) {
      addToast(intl.formatMessage(messages.removeVoteError), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await executeMediaDeletion(request.id);
      addToast(intl.formatMessage(messages.executeSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      if (onVote) onVote();
    } catch (error) {
      addToast(intl.formatMessage(messages.executeError), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelDeletionRequest(request.id);
      addToast(intl.formatMessage(messages.cancelSuccess), {
        appearance: 'success',
        autoDismiss: true,
      });
      if (onVote) onVote();
    } catch (error) {
      addToast(intl.formatMessage(messages.cancelError), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case DeletionRequestStatus.VOTING:
        return (
          <Badge badgeType="primary">
            {intl.formatMessage(globalMessages.voting)}
          </Badge>
        );
      case DeletionRequestStatus.APPROVED:
        return (
          <Badge badgeType="success">
            {intl.formatMessage(globalMessages.approved)}
          </Badge>
        );
      case DeletionRequestStatus.REJECTED:
        return (
          <Badge badgeType="danger">
            {intl.formatMessage(globalMessages.rejected)}
          </Badge>
        );
      case DeletionRequestStatus.COMPLETED:
        return (
          <Badge badgeType="emerald">
            {intl.formatMessage(globalMessages.completed)}
          </Badge>
        );
      case DeletionRequestStatus.CANCELLED:
        return (
          <Badge badgeType="warning">
            {intl.formatMessage(globalMessages.cancelled)}
          </Badge>
        );
      default:
        return (
          <Badge badgeType="default">
            {intl.formatMessage(globalMessages.pending)}
          </Badge>
        );
    }
  };

  return (
    <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-gray-800 py-2 text-gray-400 shadow-md ring-1 ring-gray-700 xl:h-28 xl:flex-row">
      {/* Backdrop Image with Gradient Overlay */}
      {request.posterPath && (
        <div className="absolute inset-0 z-0 w-full bg-cover bg-center xl:w-2/3">
          <CachedImage
            type="tmdb"
            src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${request.posterPath}`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            fill
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(31, 41, 55, 0.47) 0%, rgba(31, 41, 55, 1) 100%)',
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex w-full flex-col justify-between overflow-hidden sm:flex-row">
        {/* Left Section: Poster + Info */}
        <div className="relative z-10 flex w-full items-center overflow-hidden pl-4 pr-4 sm:pr-0 xl:w-7/12 2xl:w-2/3">
          {/* Poster */}
          <Link
            href={
              request.mediaType === MediaType.MOVIE
                ? `/movie/${request.tmdbId}`
                : `/tv/${request.tmdbId}`
            }
            className="relative h-auto w-12 flex-shrink-0 scale-100 transform-gpu overflow-hidden rounded-md transition duration-300 hover:scale-105"
          >
            <CachedImage
              type="tmdb"
              src={
                request.posterPath
                  ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${request.posterPath}`
                  : '/images/seerr_poster_not_found.png'
              }
              alt=""
              sizes="100vw"
              style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
              width={600}
              height={900}
            />
          </Link>

          {/* Title and Info */}
          <div className="flex flex-col justify-center overflow-hidden pl-2 xl:pl-4">
            <Link
              href={
                request.mediaType === MediaType.MOVIE
                  ? `/movie/${request.tmdbId}`
                  : `/tv/${request.tmdbId}`
              }
              className="mr-2 min-w-0 truncate text-lg font-bold text-white hover:underline xl:text-xl"
            >
              {request.title}
            </Link>

            {/* Status Badge */}
            <div className="mt-0.5">{getStatusBadge()}</div>

            {/* Reason if present */}
            {request.reason && (
              <div className="mt-1.5 flex items-start gap-1.5 text-sm">
                <span className="flex-shrink-0 font-semibold text-white">
                  {intl.formatMessage(messages.reason)}
                </span>
                <span
                  className="line-clamp-2 text-gray-200"
                  title={request.reason}
                >
                  {request.reason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Voting Progress + Request Info */}
        <div className="z-10 mt-4 ml-4 flex w-full flex-col justify-center gap-1 overflow-hidden pr-4 text-sm sm:ml-2 sm:mt-0 xl:flex-1 xl:pr-0">
          {/* Requested Info */}
          <div className="card-field">
            <span className="card-field-name">
              {intl.formatMessage(messages.requested)}
            </span>
            <span className="flex items-center truncate text-sm text-gray-300">
              <FormattedRelativeTime
                value={Math.floor(
                  (new Date(request.createdAt).getTime() - Date.now()) / 1000
                )}
                updateIntervalInSeconds={1}
                numeric="auto"
              />
              <span className="mx-1">•</span>
              <Link
                href={`/users/${request.requestedBy.id}`}
                className="group flex items-center truncate"
              >
                <span className="avatar-sm">
                  <CachedImage
                    type="avatar"
                    src={request.requestedBy.avatar}
                    alt=""
                    className="avatar-sm object-cover"
                    width={20}
                    height={20}
                  />
                </span>
                <span className="ml-1 truncate text-sm font-semibold group-hover:text-white group-hover:underline">
                  {request.requestedBy.displayName}
                </span>
              </Link>
            </span>
          </div>

          {/* Voting End Time */}
          <div className="card-field">
            <span className="card-field-name">
              {request.isVotingActive
                ? intl.formatMessage(messages.votingEnds)
                : intl.formatMessage(messages.votingEnded)}
            </span>
            <span className="text-sm text-gray-300">
              <FormattedRelativeTime
                value={Math.floor(
                  (new Date(request.votingEndsAt).getTime() - Date.now()) / 1000
                )}
                updateIntervalInSeconds={1}
                numeric="auto"
              />
            </span>
          </div>

          {/* Compact Vote Progress */}
          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-2 w-32 overflow-hidden rounded-full bg-gray-700">
              {/* votesAgainst = Keep votes = GREEN */}
              <div
                className="bg-green-500 transition-all duration-300"
                style={{
                  width: `${
                    request.totalVotes === 0
                      ? 50
                      : (request.votesAgainst / request.totalVotes) * 100
                  }%`,
                }}
              />
              {/* votesFor = Remove votes = RED */}
              <div
                className="bg-red-500 transition-all duration-300"
                style={{
                  width: `${
                    request.totalVotes === 0
                      ? 50
                      : (request.votesFor / request.totalVotes) * 100
                  }%`,
                }}
              />
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-400">
                {intl.formatMessage(messages.votesAgainst, {
                  count: request.votesAgainst,
                })}
              </span>
              <span>•</span>
              <span className="text-red-400">
                {intl.formatMessage(messages.votesFor, {
                  count: request.votesFor,
                })}
              </span>
            </div>
          </div>

          {/* User's Vote Status */}
          {userVote && (
            <div className="text-xs">
              {/* userVote.vote: false = Keep, true = Remove */}
              {userVote.vote ? (
                <span className="text-red-400">
                  {intl.formatMessage(messages.youVotedRemove)}
                </span>
              ) : (
                <span className="text-green-400">
                  {intl.formatMessage(messages.youVotedKeep)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Action Buttons */}
      <div className="z-10 mt-4 flex w-full flex-col justify-center space-y-2 pl-4 pr-4 xl:mt-0 xl:w-96 xl:items-end xl:pl-0">
        {/* Vote Buttons - Only when voting is active */}
        {request.isVotingActive && userVote === null && (
          <div className="flex w-full flex-row space-x-2">
            {/* Keep button - vote AGAINST deletion (false) */}
            <span className="w-full">
              <Button
                className="w-full"
                buttonType="success"
                onClick={() => handleVote(false)}
                disabled={isVoting}
              >
                <CheckIcon />
                <span>{intl.formatMessage(messages.voteKeep)}</span>
              </Button>
            </span>
            {/* Remove button - vote FOR deletion (true) */}
            <span className="w-full">
              <Button
                className="w-full"
                buttonType="danger"
                onClick={() => handleVote(true)}
                disabled={isVoting}
              >
                <TrashIcon />
                <span>{intl.formatMessage(messages.voteRemove)}</span>
              </Button>
            </span>
          </div>
        )}

        {/* Remove Vote Button */}
        {request.isVotingActive && userVote !== null && (
          <Button
            className="w-full"
            buttonType="warning"
            onClick={handleRemoveVote}
            disabled={isVoting}
          >
            <XMarkIcon />
            <span>{intl.formatMessage(messages.removeVote)}</span>
          </Button>
        )}

        {/* Execute Deletion Button (Admin only, when approved) */}
        {canExecute && !isExecuting && (
          <ConfirmButton
            onClick={handleExecute}
            confirmText={intl.formatMessage(globalMessages.areyousure)}
            className="w-full"
          >
            <TrashIcon />
            <span>{intl.formatMessage(messages.executeDeletion)}</span>
          </ConfirmButton>
        )}

        {/* Cancel Request Button (Requester or Admin) */}
        {canCancel && !isCancelling && (
          <ConfirmButton
            onClick={handleCancel}
            confirmText={intl.formatMessage(globalMessages.areyousure)}
            className="w-full"
          >
            <XMarkIcon />
            <span>{intl.formatMessage(messages.cancelRequest)}</span>
          </ConfirmButton>
        )}
      </div>
    </div>
  );
};

export default DeletionRequestCard;
