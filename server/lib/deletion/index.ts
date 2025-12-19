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
import notificationManager, { Notification } from '@server/lib/notifications';
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
    const mediaRepository = getRepository(Media);
    const settings = getSettings();

    // Get media object for notifications
    const media = await mediaRepository.findOne({
      where: { id: mediaId },
    });

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

    // Send notification for deletion voting started
    if (media) {
      try {
        const mediaTypeString =
          mediaType === MediaType.MOVIE ? 'Movie' : 'Series';

        notificationManager.sendNotification(
          Notification.MEDIA_DELETION_VOTING,
          {
            event: `${mediaTypeString} Deletion Voting Started`,
            subject: title,
            message: reason || 'No reason provided',
            media,
            image: posterPath
              ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${posterPath}`
              : undefined,
            notifyAdmin: true,
            notifySystem: true,
            extra: [
              {
                name: 'Requested By',
                value:
                  requestedBy.displayName ||
                  requestedBy.jellyfinUsername ||
                  requestedBy.plexUsername ||
                  requestedBy.email ||
                  'Unknown',
              },
              {
                name: 'Voting Ends',
                value: votingEndsAt.toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              },
              {
                name: 'Duration',
                value: `${votingDurationHours} hours`,
              },
            ],
          }
        );
      } catch (error) {
        logger.error('Failed to send deletion voting notification', {
          label: 'Deletion Service',
          error: error.message,
          deletionRequestId: deletionRequest.id,
        });
      }
    }

    return deletionRequest;
  }

  /**
   * Vote on a deletion request
   * @param vote - true = FOR deletion (remove), false = AGAINST deletion (keep)
   */
  public async voteOnDeletion({
    deletionRequestId,
    user,
    vote,
  }: {
    deletionRequestId: number;
    user: User;
    vote: boolean; // true = FOR deletion (remove), false = AGAINST deletion (keep)
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
    const mediaRepository = getRepository(Media);
    const settings = getSettings();

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy'],
    });

    if (!deletionRequest) {
      throw new DeletionNotFoundError();
    }

    // Get media object for notifications
    const media = await mediaRepository.findOne({
      where: { id: deletionRequest.mediaId },
    });

    // Check if voting period has ended
    if (new Date() < new Date(deletionRequest.votingEndsAt)) {
      throw new Error('Voting period has not ended yet');
    }

    // Check status
    if (deletionRequest.status !== DeletionRequestStatus.VOTING) {
      throw new InvalidStatusError('Request is not in voting status');
    }

    // Calculate vote percentage for deletion
    // votePercentage = (votesFor / totalVotes) * 100
    // votesFor = votes FOR deletion (true votes)
    const votePercentage = deletionRequest.getVotePercentage();
    const requiredPercentage = settings.main.deletion.requiredVotePercentage;

    logger.info('🔍 Processing deletion request vote', {
      label: 'Deletion Service',
      deletionRequestId,
      title: deletionRequest.title,
      votePercentage: votePercentage.toFixed(1),
      requiredPercentage,
      autoDeleteEnabled: settings.main.deletion.autoDeleteOnApproval,
      votesFor: deletionRequest.votesFor,
      votesAgainst: deletionRequest.votesAgainst,
      currentStatus: deletionRequest.status,
    });

    // Determine if approved or rejected
    // If enough votes FOR deletion → APPROVED (will be deleted)
    // Otherwise → REJECTED (will be kept)
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

      // Send notification for approval
      if (media) {
        try {
          const mediaTypeString =
            deletionRequest.mediaType === MediaType.MOVIE ? 'Movie' : 'Series';
          const totalVotes =
            deletionRequest.votesFor + deletionRequest.votesAgainst;

          notificationManager.sendNotification(
            Notification.MEDIA_DELETION_APPROVED,
            {
              event: `${mediaTypeString} Deletion Request Approved`,
              subject: deletionRequest.title,
              message: `Deletion approved with ${votePercentage.toFixed(
                1
              )}% voting for removal (${
                deletionRequest.votesFor
              }/${totalVotes} votes)`,
              media,
              image: deletionRequest.posterPath
                ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${deletionRequest.posterPath}`
                : undefined,
              notifyAdmin: true,
              notifySystem: true,
              extra: [
                {
                  name: 'Votes',
                  value: `${deletionRequest.votesFor} for removal, ${deletionRequest.votesAgainst} to keep`,
                },
                {
                  name: 'Percentage',
                  value: `${votePercentage.toFixed(1)}% voted for removal`,
                },
                {
                  name: 'Status',
                  value: settings.main.deletion.autoDeleteOnApproval
                    ? 'Auto-deleting...'
                    : 'Awaiting admin execution',
                },
              ],
            }
          );
        } catch (error) {
          logger.error('Failed to send deletion approved notification', {
            label: 'Deletion Service',
            error: error.message,
            deletionRequestId,
          });
        }
      }

      // Auto-delete if enabled
      if (settings.main.deletion.autoDeleteOnApproval) {
        logger.info(
          '🚀 Auto-deletion enabled, executing deletion immediately',
          {
            label: 'Deletion Service',
            deletionRequestId,
            title: deletionRequest.title,
          }
        );

        try {
          // Execute deletion (this will save with COMPLETED status)
          await this.executeMediaDeletion({
            deletionRequestId,
            processedBy: deletionRequest.requestedBy,
          });

          // Reload the request to get the updated COMPLETED status
          const completedRequest = await deletionRequestRepository.findOne({
            where: { id: deletionRequestId },
            relations: ['requestedBy', 'processedBy'],
          });

          logger.info('✅ Auto-deletion completed successfully', {
            label: 'Deletion Service',
            deletionRequestId,
            title: deletionRequest.title,
            finalStatus: completedRequest?.status,
            processedAt: completedRequest?.processedAt,
          });

          // Return early - executeMediaDeletion already saved with COMPLETED status
          // Don't save again or we'll overwrite with APPROVED
          return completedRequest || deletionRequest;
        } catch (error) {
          logger.error('❌ Failed to auto-delete media after approval', {
            label: 'Deletion Service',
            error: error.message,
            stack: error.stack,
            deletionRequestId,
            title: deletionRequest.title,
          });
          // CRITICAL FIX: Save with APPROVED status and return early
          // Don't let execution continue to line 522 where we would save with stale APPROVED status
          deletionRequest.processedAt = new Date();
          await deletionRequestRepository.save(deletionRequest);

          logger.info('💾 Saved as APPROVED after auto-delete failure', {
            label: 'Deletion Service',
            deletionRequestId,
            status: deletionRequest.status,
            processedAt: deletionRequest.processedAt,
          });

          return deletionRequest;
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

      // Send notification for rejection
      if (media) {
        try {
          const mediaTypeString =
            deletionRequest.mediaType === MediaType.MOVIE ? 'Movie' : 'Series';
          const totalVotes =
            deletionRequest.votesFor + deletionRequest.votesAgainst;
          const votesAgainstPercentage = 100 - votePercentage;

          notificationManager.sendNotification(
            Notification.MEDIA_DELETION_REJECTED,
            {
              event: `${mediaTypeString} Deletion Request Rejected`,
              subject: deletionRequest.title,
              message: `Deletion rejected with ${votesAgainstPercentage.toFixed(
                1
              )}% voting to keep (${
                deletionRequest.votesAgainst
              }/${totalVotes} votes)`,
              media,
              image: deletionRequest.posterPath
                ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${deletionRequest.posterPath}`
                : undefined,
              notifyAdmin: true,
              notifySystem: true,
              extra: [
                {
                  name: 'Votes',
                  value: `${deletionRequest.votesAgainst} to keep, ${deletionRequest.votesFor} for removal`,
                },
                {
                  name: 'Percentage',
                  value: `${votesAgainstPercentage.toFixed(1)}% voted to keep`,
                },
                {
                  name: 'Status',
                  value: 'Media will remain available',
                },
              ],
            }
          );
        } catch (error) {
          logger.error('Failed to send deletion rejected notification', {
            label: 'Deletion Service',
            error: error.message,
            deletionRequestId,
          });
        }
      }
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
    logger.info('🎬 executeMediaDeletion called', {
      label: 'Deletion Service',
      deletionRequestId,
      processedById: processedBy?.id,
      processedByName: processedBy?.displayName,
    });

    const deletionRequestRepository = getRepository(DeletionRequest);
    const mediaRepository = getRepository(Media);
    const settings = getSettings();

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: deletionRequestId },
      relations: ['requestedBy', 'processedBy'],
    });

    logger.info('📄 Deletion request loaded', {
      label: 'Deletion Service',
      deletionRequestId,
      found: !!deletionRequest,
      status: deletionRequest?.status,
      title: deletionRequest?.title,
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
        if (!radarrSettings) {
          logger.warn(
            'No default Radarr server configured, skipping Radarr deletion',
            {
              label: 'Deletion Service',
              deletionRequestId,
            }
          );
        } else {
          try {
            const radarr = new RadarrAPI({
              url: RadarrAPI.buildUrl(radarrSettings, '/api/v3'),
              apiKey: radarrSettings.apiKey,
            });
            await radarr.removeMovie(deletionRequest.tmdbId);
            logger.info(
              `Movie removed from Radarr: ${deletionRequest.title} (TMDB: ${deletionRequest.tmdbId})`,
              {
                label: 'Deletion Service',
                deletionRequestId,
              }
            );
          } catch (radarrError) {
            // Handle 404 - media already deleted from Radarr
            if (radarrError.response?.status === 404) {
              logger.info(
                'Movie already deleted from Radarr (404), continuing',
                {
                  label: 'Deletion Service',
                  deletionRequestId,
                  tmdbId: deletionRequest.tmdbId,
                }
              );
            } else {
              // Log error but don't fail the entire deletion
              logger.error(
                'Failed to delete movie from Radarr, but continuing with local deletion',
                {
                  label: 'Deletion Service',
                  deletionRequestId,
                  error: radarrError.message,
                }
              );
            }
          }
        }
      } else if (deletionRequest.mediaType === MediaType.TV) {
        // Delete from Sonarr
        const sonarrSettings = settings.sonarr.find(
          (s) => !s.is4k && s.isDefault
        );
        if (!sonarrSettings) {
          logger.warn(
            'No default Sonarr server configured, skipping Sonarr deletion',
            {
              label: 'Deletion Service',
              deletionRequestId,
            }
          );
        } else if (!media.tvdbId) {
          logger.warn(
            `Cannot delete series from Sonarr: TVDB ID not found for ${deletionRequest.title}`,
            {
              label: 'Deletion Service',
              deletionRequestId,
              tmdbId: deletionRequest.tmdbId,
            }
          );
        } else {
          try {
            const sonarr = new SonarrAPI({
              url: SonarrAPI.buildUrl(sonarrSettings, '/api/v3'),
              apiKey: sonarrSettings.apiKey,
            });
            // Use TVDB ID for Sonarr (not TMDB ID)
            await sonarr.removeSeries(media.tvdbId);
            logger.info(
              `Series removed from Sonarr: ${deletionRequest.title} (TVDB: ${media.tvdbId})`,
              {
                label: 'Deletion Service',
                deletionRequestId,
                tvdbId: media.tvdbId,
              }
            );
          } catch (sonarrError) {
            // Handle 404 - series already deleted from Sonarr
            if (sonarrError.response?.status === 404) {
              logger.info(
                'Series already deleted from Sonarr (404), continuing',
                {
                  label: 'Deletion Service',
                  deletionRequestId,
                  tvdbId: media.tvdbId,
                }
              );
            } else {
              // Log error but don't fail the entire deletion
              logger.error(
                'Failed to delete series from Sonarr, but continuing with local deletion',
                {
                  label: 'Deletion Service',
                  deletionRequestId,
                  error: sonarrError.message,
                }
              );
            }
          }
        }
      }

      // Update deletion request
      deletionRequest.status = DeletionRequestStatus.COMPLETED;
      deletionRequest.processedAt = new Date();
      deletionRequest.processedBy = processedBy;

      logger.info('💾 Saving deletion request as COMPLETED', {
        label: 'Deletion Service',
        deletionRequestId,
        title: deletionRequest.title,
        status: deletionRequest.status,
        processedAt: deletionRequest.processedAt,
      });

      await deletionRequestRepository.save(deletionRequest);

      logger.info(
        `✅ Deletion request ${deletionRequestId} completed successfully`,
        {
          label: 'Deletion Service',
          title: deletionRequest.title,
          mediaType: deletionRequest.mediaType,
          tmdbId: deletionRequest.tmdbId,
        }
      );

      // Send notification for deletion completed
      if (media) {
        try {
          const mediaTypeString =
            deletionRequest.mediaType === MediaType.MOVIE ? 'Movie' : 'Series';

          notificationManager.sendNotification(
            Notification.MEDIA_DELETION_COMPLETED,
            {
              event: `${mediaTypeString} Deleted`,
              subject: deletionRequest.title,
              message: 'Media has been permanently deleted from the server',
              media,
              image: deletionRequest.posterPath
                ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${deletionRequest.posterPath}`
                : undefined,
              notifyAdmin: true,
              notifySystem: true,
              extra: [
                {
                  name: 'Deleted By',
                  value:
                    processedBy.displayName ||
                    processedBy.jellyfinUsername ||
                    processedBy.plexUsername ||
                    processedBy.email ||
                    'Unknown',
                },
                {
                  name: 'Final Vote',
                  value: `${deletionRequest.votesFor} for removal, ${deletionRequest.votesAgainst} to keep`,
                },
                {
                  name: 'Files',
                  value: 'Removed from disk',
                },
              ],
            }
          );
        } catch (error) {
          logger.error('Failed to send deletion completed notification', {
            label: 'Deletion Service',
            error: error.message,
            deletionRequestId,
          });
        }
      }

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
