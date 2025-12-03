import Badge from '@app/components/Common/Badge';
import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import {
  removeVote,
  useUserVote,
  voteOnDeletion,
} from '@app/hooks/useDeletionRequests';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { DeletionRequestStatus } from '@app/utils/deletionConstants';
import {
  CheckCircleIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import type { DeletionRequestResult } from '@server/interfaces/api/deletionInterfaces';
import Link from 'next/link';
import { useState } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';

const messages = defineMessages(
  'components.Discover.DeletionRequestSlider.DeletionSliderCard',
  {
    votingEnded: 'Voting ended',
    voteSuccess: 'Vote submitted successfully',
    voteRemoved: 'Vote removed',
    voteChanged: 'Vote changed successfully',
    voteFailed: 'Failed to submit vote',
    removeVoteFailed: 'Failed to remove vote',
    keepIt: 'Keep',
    removeIt: 'Remove',
  }
);

const DeletionSliderCardPlaceholder = () => {
  return (
    <div className="relative w-72 animate-pulse rounded-xl bg-gray-700 p-4 sm:w-96">
      <div className="w-20 sm:w-28">
        <div className="w-full" style={{ paddingBottom: '150%' }} />
      </div>
    </div>
  );
};

interface DeletionSliderCardProps {
  request: DeletionRequestResult;
  onVoteUpdate?: () => void;
}

const DeletionSliderCard = ({
  request,
  onVoteUpdate,
}: DeletionSliderCardProps) => {
  const intl = useIntl();
  const { addToast } = useToasts();
  const [isVoting, setIsVoting] = useState(false);
  const { vote: userVote, mutate: mutateUserVote } = useUserVote(request.id);

  const mediaUrl =
    request.mediaType === 'movie'
      ? `/movie/${request.tmdbId}`
      : `/tv/${request.tmdbId}`;

  const isVotingActive = new Date() < new Date(request.votingEndsAt);

  const handleButtonClick = async (vote: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsVoting(true);
    try {
      // If clicking the same vote button, remove the vote
      if (userVote && userVote.vote === vote) {
        await removeVote(request.id);
        addToast(intl.formatMessage(messages.voteRemoved), {
          appearance: 'info',
          autoDismiss: true,
        });
      } else {
        // Either voting for the first time or changing vote
        await voteOnDeletion(request.id, vote);
        const message = userVote ? messages.voteChanged : messages.voteSuccess;
        addToast(intl.formatMessage(message), {
          appearance: 'success',
          autoDismiss: true,
        });
      }
      mutateUserVote();
      onVoteUpdate?.();
    } catch (error) {
      addToast(intl.formatMessage(messages.voteFailed), {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const getButtonType = (voteValue: boolean) => {
    if (!userVote) {
      // Not voted - show active buttons
      return voteValue ? 'success' : 'danger';
    }
    if (userVote.vote === voteValue) {
      // This is the voted button - highlight it
      return voteValue ? 'success' : 'danger';
    }
    // Other button - make it ghost/inactive
    return 'ghost';
  };

  const getButtonIcon = (voteValue: boolean) => {
    if (userVote && userVote.vote === voteValue) {
      return <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
    return voteValue ? (
      <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
    ) : (
      <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
    );
  };

  const getButtonText = (voteValue: boolean) => {
    if (userVote && userVote.vote === voteValue) {
      return voteValue
        ? intl.formatMessage(messages.keepIt)
        : intl.formatMessage(messages.removeIt);
    }
    return voteValue
      ? intl.formatMessage(messages.keepIt)
      : intl.formatMessage(messages.removeIt);
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
          <Badge badgeType="dark">
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
    <div
      className="relative flex w-72 overflow-hidden rounded-xl bg-gray-800 bg-cover bg-center p-4 text-gray-400 shadow ring-1 ring-gray-700 sm:w-96"
      data-testid="deletion-slider-card"
    >
      {/* Backdrop Image with Gradient Overlay */}
      {request.posterPath && (
        <div className="absolute inset-0 z-0">
          <CachedImage
            type="tmdb"
            alt=""
            src={`https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${request.posterPath}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            fill
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(17, 24, 39, 0.47) 0%, rgba(17, 24, 39, 1) 75%)',
            }}
          />
        </div>
      )}

      {/* Content Section */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pr-4">
        {/* Title */}
        <Link
          href={mediaUrl}
          className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white hover:underline sm:text-lg"
        >
          {request.title}
        </Link>

        {/* Voting ends time */}
        <div className="mt-2 text-xs text-gray-400 sm:mt-1 sm:text-sm">
          Voting ends{' '}
          <FormattedRelativeTime
            value={Math.floor(
              (new Date(request.votingEndsAt).getTime() - Date.now()) / 1000
            )}
            updateIntervalInSeconds={60}
            numeric="auto"
          />
        </div>

        {/* Status Badge */}
        <div className="mt-2 flex items-center text-sm sm:mt-1">
          {getStatusBadge()}
        </div>

        {/* Vote Buttons */}
        <div className="flex flex-1 items-end space-x-2">
          {isVotingActive ? (
            <>
              <Button
                buttonType={getButtonType(true)}
                disabled={isVoting}
                onClick={(e) => handleButtonClick(true, e)}
                buttonSize="sm"
              >
                <span className="hidden sm:inline">{getButtonIcon(true)}</span>
                <span>{getButtonText(true)}</span>
              </Button>
              <Button
                buttonType={getButtonType(false)}
                disabled={isVoting}
                onClick={(e) => handleButtonClick(false, e)}
                buttonSize="sm"
              >
                <span className="hidden sm:inline">{getButtonIcon(false)}</span>
                <span>{getButtonText(false)}</span>
              </Button>
            </>
          ) : (
            <span className="text-xs text-gray-400">
              {intl.formatMessage(messages.votingEnded)}
            </span>
          )}
        </div>
      </div>

      {/* Poster Thumbnail */}
      <Link
        href={mediaUrl}
        className="w-20 flex-shrink-0 scale-100 transform-gpu cursor-pointer overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md sm:w-28"
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
          style={{ width: '100%', height: 'auto' }}
          width={600}
          height={900}
        />
      </Link>
    </div>
  );
};

DeletionSliderCard.Placeholder = DeletionSliderCardPlaceholder;

export default DeletionSliderCard;
