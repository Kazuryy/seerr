import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaReview } from '@server/entity/MediaReview';
import type { User } from '@server/entity/User';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';
import { IsNull } from 'typeorm';
import { z } from 'zod';

const trackingRoutes = Router();

// Zod schemas for validation
const markAsWatchedSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  seasonNumber: z.number().int().positive().optional(),
  episodeNumber: z.number().int().positive().optional(),
  watchedAt: z.string().datetime().optional(),
});

const createReviewSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  seasonNumber: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  content: z.string().max(5000).optional(),
  containsSpoilers: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  watchedAt: z.string().datetime().optional(),
});

const getWatchHistorySchema = z.object({
  take: z.coerce.number().int().positive().max(100).default(20),
  skip: z.coerce.number().int().nonnegative().default(0),
  mediaType: z.enum(['movie', 'tv']).optional(),
});

const getReviewsSchema = z.object({
  take: z.coerce.number().int().positive().max(100).default(20),
  skip: z.coerce.number().int().nonnegative().default(0),
  mediaId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  isPublic: z.coerce.boolean().optional(),
});

/**
 * POST /api/v1/tracking/watch
 * Mark media as watched
 */
trackingRoutes.post('/watch', isAuthenticated(), async (req, res, next) => {
  try {
    const validatedBody = markAsWatchedSchema.parse(req.body);
    const user = req.user as User;

    // Verify media exists
    const mediaRepository = getRepository(Media);
    const media = await mediaRepository.findOne({
      where: {
        id: validatedBody.mediaId,
        mediaType: validatedBody.mediaType as MediaType,
      },
    });

    if (!media) {
      return next({
        status: 404,
        message: 'Media not found.',
      });
    }

    // Create watch history entry
    const watchHistoryRepository = getRepository(WatchHistory);
    const watchHistory = new WatchHistory({
      userId: user.id,
      mediaId: validatedBody.mediaId,
      mediaType: validatedBody.mediaType as MediaType,
      seasonNumber: validatedBody.seasonNumber,
      episodeNumber: validatedBody.episodeNumber,
      watchedAt: validatedBody.watchedAt
        ? new Date(validatedBody.watchedAt)
        : new Date(),
    });

    await watchHistoryRepository.save(watchHistory);

    logger.info(
      `User ${user.displayName} marked media ${media.id} as watched`,
      {
        label: 'Tracking Routes',
        userId: user.id,
        mediaId: media.id,
      }
    );

    return res.status(201).json(watchHistory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next({
        status: 400,
        message: 'Invalid request body.',
        errors: error.errors,
      });
    }

    logger.error('Failed to create watch history entry', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to mark media as watched.',
    });
  }
});

/**
 * GET /api/v1/tracking/watch
 * Get user's watch history
 */
trackingRoutes.get('/watch', isAuthenticated(), async (req, res, next) => {
  try {
    const { take, skip, mediaType } = getWatchHistorySchema.parse(req.query);
    const user = req.user as User;

    const watchHistoryRepository = getRepository(WatchHistory);
    let query = watchHistoryRepository
      .createQueryBuilder('watchHistory')
      .leftJoinAndSelect('watchHistory.media', 'media')
      .where('watchHistory.userId = :userId', { userId: user.id });

    if (mediaType) {
      query = query.andWhere('watchHistory.mediaType = :mediaType', {
        mediaType,
      });
    }

    const [watchHistory, totalCount] = await query
      .orderBy('watchHistory.watchedAt', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(totalCount / take),
        pageSize: take,
        results: totalCount,
        page: Math.ceil(skip / take) + 1,
      },
      results: watchHistory,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next({
        status: 400,
        message: 'Invalid query parameters.',
        errors: error.errors,
      });
    }

    logger.error('Failed to retrieve watch history', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to retrieve watch history.',
    });
  }
});

/**
 * GET /api/v1/tracking/watch/:mediaId
 * Get watch history for a specific media
 */
trackingRoutes.get<{ mediaId: string }>(
  '/watch/:mediaId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const user = req.user as User;

      const watchHistoryRepository = getRepository(WatchHistory);
      const watchHistory = await watchHistoryRepository.find({
        where: {
          userId: user.id,
          mediaId,
        },
        order: {
          watchedAt: 'DESC',
        },
      });

      return res.status(200).json(watchHistory);
    } catch (error) {
      logger.error('Failed to retrieve watch history for media', {
        label: 'Tracking Routes',
        error: error.message,
        mediaId: req.params.mediaId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve watch history for this media.',
      });
    }
  }
);

/**
 * DELETE /api/v1/tracking/watch/:watchId
 * Delete a watch history entry
 */
trackingRoutes.delete<{ watchId: string }>(
  '/watch/:watchId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const watchId = Number(req.params.watchId);
      const user = req.user as User;

      const watchHistoryRepository = getRepository(WatchHistory);
      const watchHistory = await watchHistoryRepository.findOne({
        where: { id: watchId },
      });

      if (!watchHistory) {
        return next({
          status: 404,
          message: 'Watch history entry not found.',
        });
      }

      // Only allow users to delete their own entries
      if (watchHistory.userId !== user.id) {
        return next({
          status: 403,
          message: 'You can only delete your own watch history entries.',
        });
      }

      await watchHistoryRepository.remove(watchHistory);

      logger.info(
        `User ${user.displayName} deleted watch history entry ${watchId}`,
        {
          label: 'Tracking Routes',
          userId: user.id,
          watchId,
        }
      );

      return res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete watch history entry', {
        label: 'Tracking Routes',
        error: error.message,
        watchId: req.params.watchId,
      });

      return next({
        status: 500,
        message: 'Unable to delete watch history entry.',
      });
    }
  }
);

/**
 * POST /api/v1/tracking/reviews
 * Create or update a review
 */
trackingRoutes.post('/reviews', isAuthenticated(), async (req, res, next) => {
  try {
    const validatedBody = createReviewSchema.parse(req.body);
    const user = req.user as User;

    // Validate that at least rating or content is provided
    if (!validatedBody.rating && !validatedBody.content) {
      return next({
        status: 400,
        message: 'Review must include either a rating or content.',
      });
    }

    // Verify media exists
    const mediaRepository = getRepository(Media);
    const media = await mediaRepository.findOne({
      where: {
        id: validatedBody.mediaId,
        mediaType: validatedBody.mediaType as MediaType,
      },
    });

    if (!media) {
      return next({
        status: 404,
        message: 'Media not found.',
      });
    }

    const reviewRepository = getRepository(MediaReview);

    // Check if review already exists
    const existingReview = await reviewRepository.findOne({
      where: {
        userId: user.id,
        mediaId: validatedBody.mediaId,
        seasonNumber: validatedBody.seasonNumber ?? IsNull(),
      },
    });

    let review: MediaReview;

    if (existingReview) {
      // Update existing review
      Object.assign(existingReview, {
        rating: validatedBody.rating,
        content: validatedBody.content,
        containsSpoilers: validatedBody.containsSpoilers,
        isPublic: validatedBody.isPublic,
        watchedAt: validatedBody.watchedAt
          ? new Date(validatedBody.watchedAt)
          : existingReview.watchedAt,
      });
      review = await reviewRepository.save(existingReview);

      logger.info(
        `User ${user.displayName} updated review for media ${media.id}`,
        {
          label: 'Tracking Routes',
          userId: user.id,
          mediaId: media.id,
          reviewId: review.id,
        }
      );
    } else {
      // Create new review
      review = new MediaReview({
        userId: user.id,
        mediaId: validatedBody.mediaId,
        mediaType: validatedBody.mediaType as MediaType,
        seasonNumber: validatedBody.seasonNumber,
        rating: validatedBody.rating,
        content: validatedBody.content,
        containsSpoilers: validatedBody.containsSpoilers,
        isPublic: validatedBody.isPublic,
        watchedAt: validatedBody.watchedAt
          ? new Date(validatedBody.watchedAt)
          : new Date(),
      });

      await reviewRepository.save(review);

      logger.info(
        `User ${user.displayName} created review for media ${media.id}`,
        {
          label: 'Tracking Routes',
          userId: user.id,
          mediaId: media.id,
          reviewId: review.id,
        }
      );
    }

    return res.status(existingReview ? 200 : 201).json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next({
        status: 400,
        message: 'Invalid request body.',
        errors: error.errors,
      });
    }

    logger.error('Failed to create/update review', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to create or update review.',
    });
  }
});

/**
 * GET /api/v1/tracking/reviews
 * Get reviews (with filters)
 */
trackingRoutes.get('/reviews', isAuthenticated(), async (req, res, next) => {
  try {
    const { take, skip, mediaId, userId, isPublic } = getReviewsSchema.parse(
      req.query
    );
    const currentUser = req.user as User;

    const reviewRepository = getRepository(MediaReview);
    let query = reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.media', 'media');

    // Apply filters
    if (mediaId) {
      query = query.andWhere('review.mediaId = :mediaId', { mediaId });
    }

    if (userId) {
      query = query.andWhere('review.userId = :userId', { userId });
    } else if (isPublic === true) {
      // Only show public reviews if not filtering by specific user
      query = query.andWhere('review.isPublic = :isPublic', { isPublic: true });
    } else if (isPublic === undefined) {
      // Show public reviews + current user's private reviews
      query = query.andWhere(
        '(review.isPublic = true OR review.userId = :currentUserId)',
        { currentUserId: currentUser.id }
      );
    }

    const [reviews, totalCount] = await query
      .orderBy('review.createdAt', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(totalCount / take),
        pageSize: take,
        results: totalCount,
        page: Math.ceil(skip / take) + 1,
      },
      results: reviews,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next({
        status: 400,
        message: 'Invalid query parameters.',
        errors: error.errors,
      });
    }

    logger.error('Failed to retrieve reviews', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to retrieve reviews.',
    });
  }
});

/**
 * GET /api/v1/tracking/reviews/:mediaId/me
 * Get current user's review for a specific media
 */
trackingRoutes.get<{ mediaId: string }>(
  '/reviews/:mediaId/me',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const seasonNumber = req.query.seasonNumber
        ? Number(req.query.seasonNumber)
        : null;
      const user = req.user as User;

      const reviewRepository = getRepository(MediaReview);
      const review = await reviewRepository.findOne({
        where: {
          userId: user.id,
          mediaId,
          seasonNumber: seasonNumber ?? IsNull(),
        },
      });

      if (!review) {
        return res.status(404).json({ message: 'Review not found.' });
      }

      return res.status(200).json(review);
    } catch (error) {
      logger.error('Failed to retrieve user review', {
        label: 'Tracking Routes',
        error: error.message,
        mediaId: req.params.mediaId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve review.',
      });
    }
  }
);

/**
 * DELETE /api/v1/tracking/reviews/:reviewId
 * Delete a review
 */
trackingRoutes.delete<{ reviewId: string }>(
  '/reviews/:reviewId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const user = req.user as User;

      const reviewRepository = getRepository(MediaReview);
      const review = await reviewRepository.findOne({
        where: { id: reviewId },
      });

      if (!review) {
        return next({
          status: 404,
          message: 'Review not found.',
        });
      }

      // Only allow users to delete their own reviews
      if (review.userId !== user.id) {
        return next({
          status: 403,
          message: 'You can only delete your own reviews.',
        });
      }

      await reviewRepository.remove(review);

      logger.info(`User ${user.displayName} deleted review ${reviewId}`, {
        label: 'Tracking Routes',
        userId: user.id,
        reviewId,
      });

      return res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete review', {
        label: 'Tracking Routes',
        error: error.message,
        reviewId: req.params.reviewId,
      });

      return next({
        status: 500,
        message: 'Unable to delete review.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/stats/:userId
 * Get user statistics
 */
trackingRoutes.get<{ userId: string }>(
  '/stats/:userId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      const watchHistoryRepository = getRepository(WatchHistory);
      const reviewRepository = getRepository(MediaReview);

      // Get watch counts
      const [movieWatchCount, tvWatchCount, totalWatchCount] =
        await Promise.all([
          watchHistoryRepository.count({
            where: { userId, mediaType: MediaType.MOVIE },
          }),
          watchHistoryRepository.count({
            where: { userId, mediaType: MediaType.TV },
          }),
          watchHistoryRepository.count({
            where: { userId },
          }),
        ]);

      // Get episode count
      const episodeCount = await watchHistoryRepository
        .createQueryBuilder('watch')
        .where('watch.userId = :userId', { userId })
        .andWhere('watch.episodeNumber IS NOT NULL')
        .getCount();

      // Get review counts and average rating
      const reviewStats = await reviewRepository
        .createQueryBuilder('review')
        .select('COUNT(review.id)', 'totalReviews')
        .addSelect('AVG(review.rating)', 'avgRating')
        .addSelect(
          'COUNT(CASE WHEN review.isPublic = true THEN 1 END)',
          'publicReviews'
        )
        .where('review.userId = :userId', { userId })
        .getRawOne();

      // Get rating distribution
      const ratingDistribution = await reviewRepository
        .createQueryBuilder('review')
        .select('review.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .where('review.userId = :userId', { userId })
        .andWhere('review.rating IS NOT NULL')
        .groupBy('review.rating')
        .orderBy('review.rating', 'ASC')
        .getRawMany();

      return res.status(200).json({
        userId,
        watchStats: {
          totalWatches: totalWatchCount,
          movieWatches: movieWatchCount,
          tvWatches: tvWatchCount,
          episodeWatches: episodeCount,
        },
        reviewStats: {
          totalReviews: Number(reviewStats.totalReviews) || 0,
          publicReviews: Number(reviewStats.publicReviews) || 0,
          privateReviews:
            Number(reviewStats.totalReviews) -
              Number(reviewStats.publicReviews) || 0,
          averageRating: reviewStats.avgRating
            ? parseFloat(Number(reviewStats.avgRating).toFixed(1))
            : null,
          ratingDistribution: ratingDistribution.map((r) => ({
            rating: Number(r.rating),
            count: Number(r.count),
          })),
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve user stats', {
        label: 'Tracking Routes',
        error: error.message,
        userId: req.params.userId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve user statistics.',
      });
    }
  }
);

export default trackingRoutes;
