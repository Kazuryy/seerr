import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import {
  DeletionRequest,
  DeletionRequestStatus,
} from '@server/entity/DeletionRequest';
import { DeletionVote } from '@server/entity/DeletionVote';
import Media from '@server/entity/Media';
import type { User } from '@server/entity/User';
import { Permission } from '@server/lib/permissions';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

export class DeletionNotFoundError extends Error {
  constructor(message = 'Deletion request not found') {
    super(message);
    this.name = 'DeletionNotFoundError';
  }
}

export class VotingClosedError extends Error {
  constructor(message = 'Voting period has ended for this deletion request') {
    super(message);
    this.name = 'VotingClosedError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'You are not authorized to perform this action') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class InvalidStatusError extends Error {
  constructor(message = 'Deletion request is not in the correct status') {
    super(message);
    this.name = 'InvalidStatusError';
  }
}

class DeletionService {
  /**
   * Create a new deletion request
   */
  public async createDeletionRequest({
    mediaId,
    mediaType,
    tmdbId,
    title,
    posterPath,
    reason,
    requestedBy,
  }: {
    mediaId: number;
    mediaType: MediaType;
    tmdbId: number;
    title: string;
    posterPath?: string;
    reason?: string;
    requestedBy: User;
  }): Promise<DeletionRequest> {
    const deletionRequestRepository = getRepository(DeletionRequest);
    const settings = getSettings();

    // Calculate voting end time (add hours as milliseconds)
    const votingDurationHours = settings.main.deletion.votingDurationHours;
    const votingEndsAt = new Date(
      Date.now() + votingDurationHours * 60 * 60 * 1000
    );

    const deletionRequest = new DeletionRequest({
      mediaId,
      mediaType,
      tmdbId,
      title,
      posterPath: posterPath || null,
      status: DeletionRequestStatus.VOTING,
      reason: reason || null,
      requestedBy,
      votingEndsAt,
      votesFor: 0,
      votesAgainst: 0,
    });

    await deletionRequestRepository.save(deletionRequest);

    logger.info(
      `Deletion request created for ${mediaType} "${title}" (${tmdbId})`,
      {
        label: 'Deletion Service',
        userId: requestedBy.id,
        deletionRequestId: deletionRequest.id,
      }
    );

    return deletionRequest;
  }

  /**
   * Vote on a deletion request
   */
  public async voteOnDeletion({
    deletionRequestId,
    user,
    vote,
  }: {
    deletionRequestId: number;
    user: User;
    vote: boolean;
  }): Promise<DeletionVote> {
    const deletionRequestRepository = getRepository(DeletionRequest);
    const deletionVoteRepository = getRepository(DeletionVote);

    // Find deletion request
    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy'],
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Check if voting is still active
    if (!deletionRequest.isVotingActive()) {
      throw new VotingClosedError();
    }

    // Check for existing vote
    const existingVote = await deletionVoteRepository.findOne({
      where: {
        deletionRequest: { id: deletionRequestId },
        user: { id: user.id },
      },
    });

    let deletionVote: DeletionVote;

    if (existingVote) {
      // Update existing vote
      const oldVote = existingVote.vote;
      existingVote.vote = vote;
      deletionVote = await deletionVoteRepository.save(existingVote);

      // Update vote counts if vote changed
      if (oldVote !== vote) {
        if (vote) {
          // Changed from against to for
          deletionRequest.votesFor++;
          deletionRequest.votesAgainst--;
        } else {
          // Changed from for to against
          deletionRequest.votesFor--;
          deletionRequest.votesAgainst++;
        }
      }

      logger.info(
        `Vote updated on deletion request ${deletionRequestId} by user ${user.id}`,
        {
          label: 'Deletion Service',
          vote,
        }
      );
    } else {
      // Create new vote
      deletionVote = new DeletionVote({
        deletionRequest,
        user,
        vote,
      });
      await deletionVoteRepository.save(deletionVote);

      // Update vote counts
      if (vote) {
        deletionRequest.votesFor++;
      } else {
        deletionRequest.votesAgainst++;
      }

      logger.info(
        `Vote cast on deletion request ${deletionRequestId} by user ${user.id}`,
        {
          label: 'Deletion Service',
          vote,
        }
      );
    }

    await deletionRequestRepository.save(deletionRequest);

    return deletionVote;
  }

  /**
   * Update vote counts for a deletion request
   */
  public async updateVoteCount(
    deletionRequestId: number
  ): Promise<DeletionRequest> {
    const deletionRequestRepository = getRepository(DeletionRequest);
    const deletionVoteRepository = getRepository(DeletionVote);

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Load all votes for this request
    const votes = await deletionVoteRepository.find({
      where: { deletionRequest: { id: deletionRequestId } },
    });

    // Count votes
    const votesFor = votes.filter((v) => v.vote === true).length;
    const votesAgainst = votes.filter((v) => v.vote === false).length;

    deletionRequest.votesFor = votesFor;
    deletionRequest.votesAgainst = votesAgainst;

    await deletionRequestRepository.save(deletionRequest);

    logger.debug(
      `Vote counts updated for deletion request ${deletionRequestId}`,
      {
        label: 'Deletion Service',
        votesFor,
        votesAgainst,
      }
    );

    return deletionRequest;
  }

  /**
   * Process voting results and update status
   */
  public async processVotingRequest(
    deletionRequestId: number
  ): Promise<DeletionRequest> {
    const deletionRequestRepository = getRepository(DeletionRequest);
    const settings = getSettings();

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy'],
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Check if voting period has ended
    if (new Date() < new Date(deletionRequest.votingEndsAt)) {
      throw new Error('Voting period has not ended yet');
    }

    // Check status
    if (deletionRequest.status !== DeletionRequestStatus.VOTING) {
      throw new InvalidStatusError('Request is not in voting status');
    }

    // Calculate vote percentage
    const votePercentage = deletionRequest.getVotePercentage();
    const requiredPercentage = settings.main.deletion.requiredVotePercentage;

    // Determine if approved or rejected
    if (votePercentage >= requiredPercentage) {
      deletionRequest.status = DeletionRequestStatus.APPROVED;
      logger.info(
        `Deletion request ${deletionRequestId} approved (${votePercentage.toFixed(
          1
        )}% >= ${requiredPercentage}%)`,
        {
          label: 'Deletion Service',
          votesFor: deletionRequest.votesFor,
          votesAgainst: deletionRequest.votesAgainst,
        }
      );

      // Auto-delete if enabled
      if (settings.main.deletion.autoDeleteOnApproval) {
        try {
          await this.executeMediaDeletion({
            deletionRequestId,
            processedBy: deletionRequest.requestedBy,
          });
        } catch (error) {
          logger.error('Failed to auto-delete media after approval', {
            label: 'Deletion Service',
            error: error.message,
            deletionRequestId,
          });
        }
      }
    } else {
      deletionRequest.status = DeletionRequestStatus.REJECTED;
      logger.info(
        `Deletion request ${deletionRequestId} rejected (${votePercentage.toFixed(
          1
        )}% < ${requiredPercentage}%)`,
        {
          label: 'Deletion Service',
          votesFor: deletionRequest.votesFor,
          votesAgainst: deletionRequest.votesAgainst,
        }
      );
    }

    await deletionRequestRepository.save(deletionRequest);

    return deletionRequest;
  }

  /**
   * Execute media deletion from Radarr/Sonarr
   */
  public async executeMediaDeletion({
    deletionRequestId,
    processedBy,
  }: {
    deletionRequestId: number;
    processedBy: User;
  }): Promise<DeletionRequest> {
    const deletionRequestRepository = getRepository(DeletionRequest);
    const mediaRepository = getRepository(Media);
    const settings = getSettings();

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy', 'processedBy'],
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Check status
    if (deletionRequest.status !== DeletionRequestStatus.APPROVED) {
      throw new InvalidStatusError('Request must be approved before deletion');
    }

    // Find media
    const media = await mediaRepository.findOne({
      where: { id: deletionRequest.mediaId },
    });

    if (!media) {
      logger.warn(`Media not found for deletion request ${deletionRequestId}`, {
        label: 'Deletion Service',
        mediaId: deletionRequest.mediaId,
      });
      deletionRequest.status = DeletionRequestStatus.COMPLETED;
      deletionRequest.processedAt = new Date();
      deletionRequest.processedBy = processedBy;
      await deletionRequestRepository.save(deletionRequest);
      return deletionRequest;
    }

    try {
      // Delete from Radarr or Sonarr
      if (deletionRequest.mediaType === MediaType.MOVIE) {
        // Delete from Radarr
        const radarrSettings = settings.radarr.find(
          (r) => !r.is4k && r.isDefault
        );
        if (radarrSettings) {
          const radarr = new RadarrAPI({
            url: RadarrAPI.buildUrl(radarrSettings, '/api/v3'),
            apiKey: radarrSettings.apiKey,
          });
          await radarr.removeMovie(deletionRequest.tmdbId);
          logger.info(
            `Movie removed from Radarr: ${deletionRequest.title} (${deletionRequest.tmdbId})`,
            {
              label: 'Deletion Service',
              deletionRequestId,
            }
          );
        }
      } else if (deletionRequest.mediaType === MediaType.TV) {
        // Delete from Sonarr
        const sonarrSettings = settings.sonarr.find(
          (s) => !s.is4k && s.isDefault
        );
        if (sonarrSettings) {
          const sonarr = new SonarrAPI({
            url: SonarrAPI.buildUrl(sonarrSettings, '/api/v3'),
            apiKey: sonarrSettings.apiKey,
          });
          await sonarr.removeSeries(deletionRequest.tmdbId);
          logger.info(
            `Series removed from Sonarr: ${deletionRequest.title} (${deletionRequest.tmdbId})`,
            {
              label: 'Deletion Service',
              deletionRequestId,
            }
          );
        }
      }

      // Update deletion request
      deletionRequest.status = DeletionRequestStatus.COMPLETED;
      deletionRequest.processedAt = new Date();
      deletionRequest.processedBy = processedBy;

      await deletionRequestRepository.save(deletionRequest);

      logger.info(
        `Deletion request ${deletionRequestId} completed successfully`,
        {
          label: 'Deletion Service',
          mediaType: deletionRequest.mediaType,
          tmdbId: deletionRequest.tmdbId,
        }
      );

      return deletionRequest;
    } catch (error) {
      logger.error('Failed to execute media deletion', {
        label: 'Deletion Service',
        error: error.message,
        deletionRequestId,
        mediaType: deletionRequest.mediaType,
        tmdbId: deletionRequest.tmdbId,
      });
      throw error;
    }
  }

  /**
   * Cancel a deletion request
   */
  public async cancelDeletionRequest({
    deletionRequestId,
    user,
  }: {
    deletionRequestId: number;
    user: User;
  }): Promise<DeletionRequest> {
    const deletionRequestRepository = getRepository(DeletionRequest);

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy'],
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Check if user is the requester or has admin permissions
    const isRequester = deletionRequest.requestedBy.id === user.id;
    const hasPermission = user.hasPermission([Permission.MANAGE_REQUESTS]);

    if (!isRequester && !hasPermission) {
      throw new UnauthorizedError(
        'Only the requester or an admin can cancel this deletion request'
      );
    }

    // Check if request can be cancelled
    if (
      deletionRequest.status === DeletionRequestStatus.COMPLETED ||
      deletionRequest.status === DeletionRequestStatus.CANCELLED
    ) {
      throw new InvalidStatusError(
        'Cannot cancel a completed or already cancelled request'
      );
    }

    deletionRequest.status = DeletionRequestStatus.CANCELLED;
    await deletionRequestRepository.save(deletionRequest);

    logger.info(`Deletion request ${deletionRequestId} cancelled by user`, {
      label: 'Deletion Service',
      userId: user.id,
      deletionRequestId,
    });

    return deletionRequest;
  }
}

export default DeletionService;
