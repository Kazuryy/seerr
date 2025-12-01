import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import {
  DeletionRequest,
  DeletionRequestStatus,
} from '@server/entity/DeletionRequest';
import { DeletionVote } from '@server/entity/DeletionVote';
import Media from '@server/entity/Media';
import type {
  CreateDeletionRequestBody,
  DeletionRequestResult,
  VoteOnDeletionBody,
} from '@server/interfaces/api/deletionInterfaces';
import DeletionService, {
  DeletionNotFoundError,
  InvalidStatusError,
  UnauthorizedError,
  VotingClosedError,
} from '@server/lib/deletion';
import { Permission } from '@server/lib/permissions';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';
import { z } from 'zod';

const deletionRoutes = Router();
const deletionService = new DeletionService();

// Zod schemas for validation
const deletionGetSchema = z.object({
  take: z.coerce.number().int().positive().default(20),
  skip: z.coerce.number().int().nonnegative().default(0),
  status: z.nativeEnum(DeletionRequestStatus).optional(),
});

const createDeletionRequestSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.nativeEnum(MediaType),
  reason: z.string().optional(),
});

const voteOnDeletionSchema = z.object({
  vote: z.boolean(),
});

/**
 * GET /api/v1/deletion
 * Get paginated list of deletion requests
 */
deletionRoutes.get('/', isAuthenticated(), async (req, res, next) => {
  try {
    const { take, skip, status } = deletionGetSchema.parse(req.query);

    let query = getRepository(DeletionRequest)
      .createQueryBuilder('deletionRequest')
      .leftJoinAndSelect('deletionRequest.requestedBy', 'requestedBy')
      .leftJoinAndSelect('deletionRequest.processedBy', 'processedBy');

    if (status) {
      query = query.where('deletionRequest.status = :status', { status });
    }

    const [deletionRequests, totalCount] = await query
      .orderBy('deletionRequest.createdAt', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    const results: DeletionRequestResult[] = deletionRequests.map(
      (dr) => dr.toJSON() as unknown as DeletionRequestResult
    );

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(totalCount / take),
        pageSize: take,
        results: totalCount,
        page: Math.ceil(skip / take) + 1,
      },
      results,
    });
  } catch (error) {
    logger.error('Failed to retrieve deletion requests', {
      label: 'Deletion Routes',
      error: error.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve deletion requests.',
    });
  }
});

/**
 * GET /api/v1/deletion/:id
 * Get single deletion request by ID
 */
deletionRoutes.get('/:id', isAuthenticated(), async (req, res, next) => {
  try {
    const deletionRequestRepository = getRepository(DeletionRequest);

    const deletionRequest = await deletionRequestRepository.findOne({
      where: { id: Number(req.params.id) },
      relations: ['requestedBy', 'processedBy', 'votes'],
    });

    if (!deletionRequest) {
      return next({
        status: 404,
        message: 'Deletion request not found.',
      });
    }

    return res
      .status(200)
      .json(deletionRequest.toJSON() as unknown as DeletionRequestResult);
  } catch (error) {
    logger.error('Failed to retrieve deletion request', {
      label: 'Deletion Routes',
      error: error.message,
      deletionRequestId: req.params.id,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve deletion request.',
    });
  }
});

/**
 * POST /api/v1/deletion
 * Create a new deletion request
 */
deletionRoutes.post('/', isAuthenticated(), async (req, res, next) => {
  try {
    const settings = getSettings();
    const body = createDeletionRequestSchema.parse(
      req.body
    ) as CreateDeletionRequestBody;

    // Check if deletion feature is enabled
    if (!settings.main.deletion.enabled) {
      return next({
        status: 403,
        message: 'Deletion feature is not enabled.',
      });
    }

    // Check if user has permission to request deletion
    const isAdmin = req.user?.hasPermission(Permission.MANAGE_REQUESTS);
    const allowNonAdmin = settings.main.deletion.allowNonAdminDeletionRequests;

    if (!isAdmin && !allowNonAdmin) {
      return next({
        status: 403,
        message: 'You do not have permission to request media deletion.',
      });
    }

    // Get media details from database
    const mediaRepository = getRepository(Media);
    const media = await mediaRepository.findOne({
      where: { id: body.mediaId },
    });

    if (!media) {
      return next({
        status: 404,
        message: 'Media not found.',
      });
    }

    // Get additional details from TMDB
    const tmdb = new TheMovieDb();
    let title = '';
    let posterPath = '';

    try {
      if (body.mediaType === MediaType.MOVIE) {
        const movie = await tmdb.getMovie({ movieId: media.tmdbId });
        title = movie.title;
        posterPath = movie.poster_path || '';
      } else {
        const tv = await tmdb.getTvShow({ tvId: media.tmdbId });
        title = tv.name;
        posterPath = tv.poster_path || '';
      }
    } catch (error) {
      logger.warn('Failed to fetch media details from TMDB', {
        label: 'Deletion Routes',
        tmdbId: media.tmdbId,
        error: error.message,
      });
    }

    const deletionRequest = await deletionService.createDeletionRequest({
      mediaId: body.mediaId,
      mediaType: body.mediaType,
      tmdbId: media.tmdbId,
      title: title || 'Unknown',
      posterPath: posterPath || undefined,
      reason: body.reason,
      requestedBy: req.user!,
    });

    return res
      .status(201)
      .json(deletionRequest.toJSON() as unknown as DeletionRequestResult);
  } catch (error) {
    logger.error('Failed to create deletion request', {
      label: 'Deletion Routes',
      error: error.message,
      userId: req.user?.id,
    });
    return next({
      status: 500,
      message: 'Unable to create deletion request.',
    });
  }
});

/**
 * POST /api/v1/deletion/:id/vote
 * Vote on a deletion request
 */
deletionRoutes.post<{ id: string }>(
  '/:id/vote',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const body = voteOnDeletionSchema.parse(req.body) as VoteOnDeletionBody;

      const deletionVote = await deletionService.voteOnDeletion({
        deletionRequestId: Number(req.params.id),
        user: req.user!,
        vote: body.vote,
      });

      return res.status(200).json(deletionVote.toJSON());
    } catch (error) {
      if (error instanceof DeletionNotFoundError) {
        return next({
          status: 404,
          message: error.message,
        });
      }
      if (error instanceof VotingClosedError) {
        return next({
          status: 400,
          message: error.message,
        });
      }
      logger.error('Failed to vote on deletion request', {
        label: 'Deletion Routes',
        error: error.message,
        deletionRequestId: req.params.id,
        userId: req.user?.id,
      });
      return next({
        status: 500,
        message: 'Unable to vote on deletion request.',
      });
    }
  }
);

/**
 * DELETE /api/v1/deletion/:id/vote
 * Remove user's vote from a deletion request
 */
deletionRoutes.delete<{ id: string }>(
  '/:id/vote',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const deletionVoteRepository = getRepository(DeletionVote);

      const deletionVote = await deletionVoteRepository.findOne({
        where: {
          deletionRequest: { id: Number(req.params.id) },
          user: { id: req.user!.id },
        },
        relations: ['deletionRequest'],
      });

      if (!deletionVote) {
        return next({
          status: 404,
          message: 'Vote not found.',
        });
      }

      // Check if voting is still active
      const deletionRequest = deletionVote.deletionRequest;

      if (!deletionRequest.isVotingActive()) {
        return next({
          status: 400,
          message: 'Cannot remove vote from a closed deletion request.',
        });
      }

      // Update vote counts
      if (deletionVote.vote) {
        deletionRequest.votesFor--;
      } else {
        deletionRequest.votesAgainst--;
      }

      const deletionRequestRepository = getRepository(DeletionRequest);
      await deletionRequestRepository.save(deletionRequest);
      await deletionVoteRepository.remove(deletionVote);

      return res.status(200).json({ message: 'Vote removed successfully.' });
    } catch (error) {
      logger.error('Failed to remove vote', {
        label: 'Deletion Routes',
        error: error.message,
        deletionRequestId: req.params.id,
        userId: req.user?.id,
      });
      return next({
        status: 500,
        message: 'Unable to remove vote.',
      });
    }
  }
);

/**
 * POST /api/v1/deletion/:id/execute
 * Execute media deletion (admin only)
 */
deletionRoutes.post(
  '/:id/execute',
  isAuthenticated(Permission.MANAGE_REQUESTS),
  async (req, res, next) => {
    try {
      const deletionRequest = await deletionService.executeMediaDeletion({
        deletionRequestId: Number(req.params.id),
        processedBy: req.user!,
      });

      return res
        .status(200)
        .json(deletionRequest.toJSON() as unknown as DeletionRequestResult);
    } catch (error) {
      if (error instanceof DeletionNotFoundError) {
        return next({
          status: 404,
          message: error.message,
        });
      }
      if (error instanceof InvalidStatusError) {
        return next({
          status: 400,
          message: error.message,
        });
      }
      logger.error('Failed to execute media deletion', {
        label: 'Deletion Routes',
        error: error.message,
        deletionRequestId: req.params.id,
        userId: req.user?.id,
      });
      return next({
        status: 500,
        message: 'Unable to execute media deletion.',
      });
    }
  }
);

/**
 * POST /api/v1/deletion/:id/cancel
 * Cancel a deletion request
 */
deletionRoutes.post(
  '/:id/cancel',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const deletionRequest = await deletionService.cancelDeletionRequest({
        deletionRequestId: Number(req.params.id),
        user: req.user!,
      });

      return res
        .status(200)
        .json(deletionRequest.toJSON() as unknown as DeletionRequestResult);
    } catch (error) {
      if (error instanceof DeletionNotFoundError) {
        return next({
          status: 404,
          message: error.message,
        });
      }
      if (error instanceof UnauthorizedError) {
        return next({
          status: 403,
          message: error.message,
        });
      }
      if (error instanceof InvalidStatusError) {
        return next({
          status: 400,
          message: error.message,
        });
      }
      logger.error('Failed to cancel deletion request', {
        label: 'Deletion Routes',
        error: error.message,
        deletionRequestId: req.params.id,
        userId: req.user?.id,
      });
      return next({
        status: 500,
        message: 'Unable to cancel deletion request.',
      });
    }
  }
);

/**
 * GET /api/v1/deletion/:id/vote/me
 * Get current user's vote on a deletion request
 */
deletionRoutes.get<{ id: string }>(
  '/:id/vote/me',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const deletionVoteRepository = getRepository(DeletionVote);

      const deletionVote = await deletionVoteRepository.findOne({
        where: {
          deletionRequest: { id: Number(req.params.id) },
          user: { id: req.user!.id },
        },
        relations: ['deletionRequest', 'user'],
      });

      if (!deletionVote) {
        return res.status(200).json(null);
      }

      return res.status(200).json(deletionVote.toJSON());
    } catch (error) {
      logger.error('Failed to retrieve user vote', {
        label: 'Deletion Routes',
        error: error.message,
        deletionRequestId: req.params.id,
        userId: req.user?.id,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve vote.',
      });
    }
  }
);

export default deletionRoutes;
