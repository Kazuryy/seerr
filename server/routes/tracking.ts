import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaReview } from '@server/entity/MediaReview';
import { ReviewComment } from '@server/entity/ReviewComment';
import { ReviewLike } from '@server/entity/ReviewLike';
import type { User } from '@server/entity/User';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';
import { IsNull } from 'typeorm';
import { z } from 'zod';

const trackingRoutes = Router();

/**
 * Helper function to enrich watch history items with TMDB data
 */
async function enrichWatchHistoryWithTitles(watchHistory: WatchHistory[]) {
  const tmdb = new TheMovieDb();

  // Fetch TMDB data for all unique media items
  const enrichedHistory = await Promise.all(
    watchHistory.map(async (entry) => {
      if (!entry.media) {
        return entry;
      }

      try {
        let title: string | undefined;
        let posterPath: string | undefined;

        if (entry.mediaType === MediaType.MOVIE) {
          const movieDetails = await tmdb.getMovie({
            movieId: entry.media.tmdbId,
          });
          title = movieDetails.title;
          posterPath = movieDetails.poster_path;
        } else if (entry.mediaType === MediaType.TV) {
          const tvDetails = await tmdb.getTvShow({ tvId: entry.media.tmdbId });
          title = tvDetails.name;
          posterPath = tvDetails.poster_path;
        }

        // Return a plain object with enriched media data
        return {
          id: entry.id,
          userId: entry.userId,
          mediaId: entry.mediaId,
          mediaType: entry.mediaType,
          seasonNumber: entry.seasonNumber,
          episodeNumber: entry.episodeNumber,
          watchedAt: entry.watchedAt,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          media: {
            id: entry.media.id,
            tmdbId: entry.media.tmdbId,
            mediaType: entry.media.mediaType,
            title,
            posterPath,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch TMDB data for watch history entry', {
          label: 'Tracking Routes',
          mediaId: entry.media.tmdbId,
          mediaType: entry.mediaType,
          error: error.message,
        });
        // Return a plain object without enrichment if TMDB fetch fails
        return {
          id: entry.id,
          userId: entry.userId,
          mediaId: entry.mediaId,
          mediaType: entry.mediaType,
          seasonNumber: entry.seasonNumber,
          episodeNumber: entry.episodeNumber,
          watchedAt: entry.watchedAt,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          media: entry.media
            ? {
                id: entry.media.id,
                tmdbId: entry.media.tmdbId,
                mediaType: entry.media.mediaType,
              }
            : undefined,
        };
      }
    })
  );

  return enrichedHistory;
}

/**
 * Helper function to enrich reviews with TMDB data
 */
async function enrichReviewsWithTitles(reviews: MediaReview[]) {
  const tmdb = new TheMovieDb();

  // Fetch TMDB data for all unique media items
  const enrichedReviews = await Promise.all(
    reviews.map(async (review) => {
      if (!review.media) {
        return review;
      }

      try {
        let title: string | undefined;
        let posterPath: string | undefined;

        if (review.mediaType === MediaType.MOVIE) {
          const movieDetails = await tmdb.getMovie({
            movieId: review.media.tmdbId,
          });
          title = movieDetails.title;
          posterPath = movieDetails.poster_path;
        } else if (review.mediaType === MediaType.TV) {
          const tvDetails = await tmdb.getTvShow({ tvId: review.media.tmdbId });
          title = tvDetails.name;
          posterPath = tvDetails.poster_path;
        }

        // Return a plain object with enriched media data
        return {
          id: review.id,
          userId: review.userId,
          mediaId: review.mediaId,
          mediaType: review.mediaType,
          seasonNumber: review.seasonNumber,
          rating: review.rating,
          content: review.content,
          containsSpoilers: review.containsSpoilers,
          isPublic: review.isPublic,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          user: review.user,
          media: {
            id: review.media.id,
            tmdbId: review.media.tmdbId,
            mediaType: review.media.mediaType,
            title,
            posterPath,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch TMDB data for review', {
          label: 'Tracking Routes',
          mediaId: review.media.tmdbId,
          mediaType: review.mediaType,
          error: error.message,
        });
        // Return a plain object without enrichment if TMDB fetch fails
        return {
          id: review.id,
          userId: review.userId,
          mediaId: review.mediaId,
          mediaType: review.mediaType,
          seasonNumber: review.seasonNumber,
          rating: review.rating,
          content: review.content,
          containsSpoilers: review.containsSpoilers,
          isPublic: review.isPublic,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          user: review.user,
          media: review.media
            ? {
                id: review.media.id,
                tmdbId: review.media.tmdbId,
                mediaType: review.media.mediaType,
              }
            : undefined,
        };
      }
    })
  );

  return enrichedReviews;
}

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

const batchMarkAsWatchedSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['tv']), // Only TV shows support batch marking
  seasonNumber: z.number().int().nonnegative(),
  episodeNumbers: z.array(z.number().int().positive()).min(1),
  watchedAt: z.string().datetime().optional(),
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

    // Enrich with TMDB titles and posters
    const enrichedHistory = await enrichWatchHistoryWithTitles(watchHistory);

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(totalCount / take),
        pageSize: take,
        results: totalCount,
        page: Math.ceil(skip / take) + 1,
      },
      results: enrichedHistory,
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
        relations: ['media'],
        order: {
          watchedAt: 'DESC',
        },
      });

      // Enrich with TMDB titles and posters
      const enrichedHistory = await enrichWatchHistoryWithTitles(watchHistory);

      return res.status(200).json(enrichedHistory);
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

    const enrichedReviews = await enrichReviewsWithTitles(reviews);

    return res.status(200).json({
      pageInfo: {
        pages: Math.ceil(totalCount / take),
        pageSize: take,
        results: totalCount,
        page: Math.ceil(skip / take) + 1,
      },
      results: enrichedReviews,
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
 * GET /api/v1/tracking/top-rated
 * Get user's top-rated media items
 */
trackingRoutes.get('/top-rated', isAuthenticated(), async (req, res, next) => {
  try {
    const user = req.user as User;
    const take = req.query.take ? Number(req.query.take) : 5;

    const reviewRepository = getRepository(MediaReview);
    const reviews = await reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.media', 'media')
      .where('review.userId = :userId', { userId: user.id })
      .andWhere('review.rating IS NOT NULL')
      .orderBy('review.rating', 'DESC')
      .addOrderBy('review.createdAt', 'DESC')
      .take(take)
      .getMany();

    const enrichedReviews = await enrichReviewsWithTitles(reviews);

    // Get watch counts for each media item
    const watchHistoryRepository = getRepository(WatchHistory);
    const enrichedWithWatchCounts = await Promise.all(
      enrichedReviews.map(async (review) => {
        const watchCount = await watchHistoryRepository.count({
          where: {
            userId: user.id,
            mediaId: review.mediaId,
          },
        });

        return {
          ...review,
          watchCount,
        };
      })
    );

    return res.status(200).json(enrichedWithWatchCounts);
  } catch (error) {
    logger.error('Failed to retrieve top-rated items', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to retrieve top-rated items.',
    });
  }
});

/**
 * GET /api/v1/tracking/media/:mediaId/activity
 * Get user's activity for a specific media item
 */
trackingRoutes.get<{ mediaId: string }>(
  '/media/:mediaId/activity',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = Number(req.params.mediaId);
      const mediaType = req.query.mediaType as MediaType;
      const user = req.user as User;

      if (!mediaType || !['movie', 'tv'].includes(mediaType)) {
        return next({
          status: 400,
          message: 'Invalid or missing mediaType parameter.',
        });
      }

      // Get the Media entity
      const mediaRepository = getRepository(Media);
      const media = await mediaRepository.findOne({
        where: {
          tmdbId: mediaId,
          mediaType,
        },
      });

      if (!media) {
        // Return empty activity if media not tracked yet
        return res.status(200).json({
          watchCount: 0,
          communityStats: {
            totalRatings: 0,
            totalReviews: 0,
          },
        });
      }

      // Get user's watch count
      const watchHistoryRepository = getRepository(WatchHistory);
      const watchCount = await watchHistoryRepository.count({
        where: {
          userId: user.id,
          mediaId: media.id,
        },
      });

      // Get last watched date
      const lastWatch = await watchHistoryRepository.findOne({
        where: {
          userId: user.id,
          mediaId: media.id,
        },
        order: {
          watchedAt: 'DESC',
        },
      });

      // Get user's review
      const reviewRepository = getRepository(MediaReview);
      const userReview = await reviewRepository.findOne({
        where: {
          userId: user.id,
          mediaId: media.id,
          seasonNumber: IsNull(),
        },
      });

      // Get community stats
      const communityRatings = await reviewRepository
        .createQueryBuilder('review')
        .select('COUNT(*)', 'totalRatings')
        .addSelect('AVG(review.rating)', 'averageRating')
        .where('review.mediaId = :mediaId', { mediaId: media.id })
        .andWhere('review.seasonNumber IS NULL')
        .andWhere('review.rating IS NOT NULL')
        .getRawOne();

      const totalReviews = await reviewRepository.count({
        where: {
          mediaId: media.id,
          seasonNumber: IsNull(),
          isPublic: true,
        },
      });

      return res.status(200).json({
        watchCount,
        lastWatchedAt: lastWatch?.watchedAt,
        userReview: userReview
          ? {
              id: userReview.id,
              rating: userReview.rating,
              content: userReview.content,
              isPublic: userReview.isPublic,
              containsSpoilers: userReview.containsSpoilers,
              createdAt: userReview.createdAt,
              updatedAt: userReview.updatedAt,
            }
          : undefined,
        communityStats: {
          averageRating: communityRatings?.averageRating
            ? parseFloat(communityRatings.averageRating)
            : undefined,
          totalRatings: parseInt(communityRatings?.totalRatings || '0'),
          totalReviews,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve media activity', {
        label: 'Tracking Routes',
        error: error.message,
        mediaId: req.params.mediaId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve media activity.',
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
 * POST /api/v1/tracking/reviews/:reviewId/like
 * Like a review
 */
trackingRoutes.post<{ reviewId: string }>(
  '/reviews/:reviewId/like',
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

      // Check if review is public
      if (!review.isPublic) {
        return next({
          status: 403,
          message: 'Cannot like a private review.',
        });
      }

      const likeRepository = getRepository(ReviewLike);

      // Check if already liked
      const existingLike = await likeRepository.findOne({
        where: {
          userId: user.id,
          reviewId,
        },
      });

      if (existingLike) {
        return next({
          status: 400,
          message: 'You have already liked this review.',
        });
      }

      // Create the like
      const like = new ReviewLike({
        userId: user.id,
        reviewId,
      });

      await likeRepository.save(like);

      // Get updated like count
      const likesCount = await likeRepository.count({
        where: { reviewId },
      });

      logger.info(`User ${user.displayName} liked review ${reviewId}`, {
        label: 'Tracking Routes',
        userId: user.id,
        reviewId,
      });

      return res.status(200).json({
        liked: true,
        likesCount,
      });
    } catch (error) {
      logger.error('Failed to like review', {
        label: 'Tracking Routes',
        error: error.message,
        reviewId: req.params.reviewId,
      });

      return next({
        status: 500,
        message: 'Unable to like review.',
      });
    }
  }
);

/**
 * DELETE /api/v1/tracking/reviews/:reviewId/like
 * Unlike a review
 */
trackingRoutes.delete<{ reviewId: string }>(
  '/reviews/:reviewId/like',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const user = req.user as User;

      const likeRepository = getRepository(ReviewLike);

      // Find the like
      const like = await likeRepository.findOne({
        where: {
          userId: user.id,
          reviewId,
        },
      });

      if (!like) {
        return next({
          status: 404,
          message: 'Like not found.',
        });
      }

      await likeRepository.remove(like);

      // Get updated like count
      const likesCount = await likeRepository.count({
        where: { reviewId },
      });

      logger.info(`User ${user.displayName} unliked review ${reviewId}`, {
        label: 'Tracking Routes',
        userId: user.id,
        reviewId,
      });

      return res.status(200).json({
        liked: false,
        likesCount,
      });
    } catch (error) {
      logger.error('Failed to unlike review', {
        label: 'Tracking Routes',
        error: error.message,
        reviewId: req.params.reviewId,
      });

      return next({
        status: 500,
        message: 'Unable to unlike review.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/reviews/:reviewId/comments
 * Get comments for a review
 */
trackingRoutes.get<{ reviewId: string }>(
  '/reviews/:reviewId/comments',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.reviewId);

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

      const commentRepository = getRepository(ReviewComment);

      // Get all top-level comments (no parent) with their replies
      const comments = await commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('comment.replies', 'replies')
        .leftJoinAndSelect('replies.user', 'repliesUser')
        .where('comment.reviewId = :reviewId', { reviewId })
        .andWhere('comment.parentCommentId IS NULL')
        .orderBy('comment.createdAt', 'ASC')
        .addOrderBy('replies.createdAt', 'ASC')
        .getMany();

      // Format the response
      const formattedComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: {
          id: comment.user.id,
          displayName: comment.user.displayName,
          avatar: comment.user.avatar,
        },
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          user: {
            id: reply.user.id,
            displayName: reply.user.displayName,
            avatar: reply.user.avatar,
          },
        })),
      }));

      return res.status(200).json({
        comments: formattedComments,
      });
    } catch (error) {
      logger.error('Failed to retrieve comments', {
        label: 'Tracking Routes',
        error: error.message,
        reviewId: req.params.reviewId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve comments.',
      });
    }
  }
);

/**
 * POST /api/v1/tracking/reviews/:reviewId/comments
 * Add a comment to a review
 */
trackingRoutes.post<{ reviewId: string }>(
  '/reviews/:reviewId/comments',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const user = req.user as User;

      // Validate request body
      const bodySchema = z.object({
        content: z.string().min(1).max(5000),
        parentCommentId: z.number().optional(),
      });

      const validation = bodySchema.safeParse(req.body);

      if (!validation.success) {
        return next({
          status: 400,
          message: 'Invalid request body.',
        });
      }

      const { content, parentCommentId } = validation.data;

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

      // Check if review is public
      if (!review.isPublic) {
        return next({
          status: 403,
          message: 'Cannot comment on a private review.',
        });
      }

      const commentRepository = getRepository(ReviewComment);

      // If replying to a comment, verify it exists
      if (parentCommentId) {
        const parentComment = await commentRepository.findOne({
          where: { id: parentCommentId, reviewId },
        });

        if (!parentComment) {
          return next({
            status: 404,
            message: 'Parent comment not found.',
          });
        }
      }

      // Create the comment
      const comment = new ReviewComment({
        userId: user.id,
        reviewId,
        content,
        parentCommentId,
      });

      await commentRepository.save(comment);

      // Fetch the comment with user data
      const savedComment = await commentRepository.findOne({
        where: { id: comment.id },
        relations: ['user'],
      });

      if (!savedComment) {
        return next({
          status: 500,
          message: 'Failed to retrieve created comment.',
        });
      }

      logger.info(`User ${user.displayName} commented on review ${reviewId}`, {
        label: 'Tracking Routes',
        userId: user.id,
        reviewId,
        commentId: comment.id,
      });

      return res.status(201).json({
        id: savedComment.id,
        content: savedComment.content,
        createdAt: savedComment.createdAt,
        updatedAt: savedComment.updatedAt,
        user: {
          id: savedComment.user.id,
          displayName: savedComment.user.displayName,
          avatar: savedComment.user.avatar,
        },
      });
    } catch (error) {
      logger.error('Failed to create comment', {
        label: 'Tracking Routes',
        error: error.message,
        reviewId: req.params.reviewId,
      });

      return next({
        status: 500,
        message: 'Unable to create comment.',
      });
    }
  }
);

/**
 * DELETE /api/v1/tracking/reviews/:reviewId/comments/:commentId
 * Delete a comment
 */
trackingRoutes.delete<{ reviewId: string; commentId: string }>(
  '/reviews/:reviewId/comments/:commentId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const commentId = Number(req.params.commentId);
      const user = req.user as User;

      const commentRepository = getRepository(ReviewComment);
      const comment = await commentRepository.findOne({
        where: { id: commentId, reviewId },
      });

      if (!comment) {
        return next({
          status: 404,
          message: 'Comment not found.',
        });
      }

      // Only allow users to delete their own comments
      if (comment.userId !== user.id) {
        return next({
          status: 403,
          message: 'You can only delete your own comments.',
        });
      }

      await commentRepository.remove(comment);

      logger.info(`User ${user.displayName} deleted comment ${commentId}`, {
        label: 'Tracking Routes',
        userId: user.id,
        reviewId,
        commentId,
      });

      return res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete comment', {
        label: 'Tracking Routes',
        error: error.message,
        commentId: req.params.commentId,
      });

      return next({
        status: 500,
        message: 'Unable to delete comment.',
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

/**
 * POST /api/v1/tracking/watch/batch
 * Batch mark episodes as watched (for TV shows only)
 */
trackingRoutes.post(
  '/watch/batch',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const validatedBody = batchMarkAsWatchedSchema.parse(req.body);
      const user = req.user as User;

      // Verify media exists
      const mediaRepository = getRepository(Media);
      const media = await mediaRepository.findOne({
        where: {
          id: validatedBody.mediaId,
          mediaType: MediaType.TV,
        },
      });

      if (!media) {
        return next({
          status: 404,
          message: 'TV show not found.',
        });
      }

      // Create batch watch history entries
      const watchHistoryRepository = getRepository(WatchHistory);
      const watchedDate = validatedBody.watchedAt
        ? new Date(validatedBody.watchedAt)
        : new Date();

      const watchHistoryEntries = validatedBody.episodeNumbers.map(
        (episodeNumber) =>
          new WatchHistory({
            userId: user.id,
            mediaId: validatedBody.mediaId,
            mediaType: MediaType.TV,
            seasonNumber: validatedBody.seasonNumber,
            episodeNumber,
            watchedAt: watchedDate,
          })
      );

      await watchHistoryRepository.save(watchHistoryEntries);

      logger.info(
        `User ${user.displayName} batch marked ${watchHistoryEntries.length} episodes as watched`,
        {
          label: 'Tracking Routes',
          userId: user.id,
          mediaId: media.id,
          seasonNumber: validatedBody.seasonNumber,
          episodeCount: watchHistoryEntries.length,
        }
      );

      return res.status(201).json({
        message: 'Episodes marked as watched successfully',
        count: watchHistoryEntries.length,
        entries: watchHistoryEntries,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next({
          status: 400,
          message: 'Invalid request body',
          errors: error.errors,
        });
      }

      logger.error('Failed to batch mark episodes as watched', {
        label: 'Tracking Routes',
        error: error.message,
      });

      return next({
        status: 500,
        message: 'Unable to mark episodes as watched.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/reviews/feed
 * Get public reviews feed from the community
 */
trackingRoutes.get(
  '/reviews/feed',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const user = req.user as User;
      const mediaType = req.query.mediaType as string | undefined;
      const sort = (req.query.sort as string) || 'latest';
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const reviewRepository = getRepository(MediaReview);
      const likeRepository = getRepository(ReviewLike);
      const commentRepository = getRepository(ReviewComment);

      // Build base query
      let query = reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.media', 'media')
        .where('review.isPublic = :isPublic', { isPublic: true });

      // Filter by media type if specified
      if (mediaType && mediaType !== 'all') {
        query = query.andWhere('review.mediaType = :mediaType', { mediaType });
      }

      // Sort
      if (sort === 'top') {
        // Get reviews with most likes in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        query = query
          .leftJoin('review.likes', 'likes')
          .andWhere('review.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
          .groupBy('review.id')
          .addGroupBy('user.id')
          .addGroupBy('media.id')
          .orderBy('COUNT(likes.id)', 'DESC')
          .addOrderBy('review.createdAt', 'DESC');
      } else {
        // Latest
        query = query.orderBy('review.createdAt', 'DESC');
      }

      // Pagination
      query = query.skip(offset).take(limit);

      const reviews = await query.getMany();

      // Enrich with TMDB data and counts
      const enrichedReviews = await enrichReviewsWithTitles(reviews);

      // Get likes and comments counts
      const reviewsWithCounts = await Promise.all(
        enrichedReviews.map(async (review) => {
          const [likesCount, commentsCount, isLikedByMe] = await Promise.all([
            likeRepository.count({ where: { reviewId: review.id } }),
            commentRepository.count({ where: { reviewId: review.id } }),
            likeRepository
              .findOne({
                where: { reviewId: review.id, userId: user.id },
              })
              .then((like) => !!like),
          ]);

          return {
            id: review.id,
            user: {
              id: review.user.id,
              displayName: review.user.displayName,
              avatar: review.user.avatar,
            },
            media: review.media,
            rating: review.rating,
            content: review.content,
            containsSpoilers: review.containsSpoilers,
            createdAt: review.createdAt,
            likesCount,
            commentsCount,
            isLikedByMe,
          };
        })
      );

      return res.status(200).json({
        reviews: reviewsWithCounts,
      });
    } catch (error) {
      logger.error('Failed to retrieve community feed', {
        label: 'Tracking Routes',
        error: error.message,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve community feed.',
      });
    }
  }
);

export default trackingRoutes;
