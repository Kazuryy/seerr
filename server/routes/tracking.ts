import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { DailyActivity } from '@server/entity/DailyActivity';
import Media from '@server/entity/Media';
import { MediaReview } from '@server/entity/MediaReview';
import { ReviewComment } from '@server/entity/ReviewComment';
import { ReviewLike } from '@server/entity/ReviewLike';
import type { User } from '@server/entity/User';
import { WatchHistory } from '@server/entity/WatchHistory';
import badgeService from '@server/lib/badgeService';
import seriesProgressService from '@server/lib/seriesProgressService';
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
        let backdropPath: string | undefined;
        let validTmdbId = entry.media.tmdbId;

        if (entry.mediaType === MediaType.MOVIE) {
          if (entry.media.tmdbId) {
            try {
              const movieDetails = await tmdb.getMovie({
                movieId: entry.media.tmdbId,
              });
              title = movieDetails.title;
              posterPath = movieDetails.poster_path;
              backdropPath = movieDetails.backdrop_path;
            } catch (error) {
              // Invalid TMDB ID - try to correct it using IMDb ID
              logger.warn(
                `Invalid TMDB ID ${entry.media.tmdbId} for movie ${entry.media.id}, attempting correction`,
                { label: 'Tracking Routes' }
              );

              if (entry.media.imdbId) {
                try {
                  const correctedMedia = await tmdb.getMediaByImdbId({
                    imdbId: entry.media.imdbId,
                  });
                  validTmdbId = correctedMedia.id;
                  title = (correctedMedia as any).title;
                  posterPath = (correctedMedia as any).poster_path;
                  backdropPath = (correctedMedia as any).backdrop_path;

                  // Update the media entity with correct TMDB ID
                  const mediaRepository = getRepository(Media);
                  entry.media.tmdbId = validTmdbId;
                  await mediaRepository.save(entry.media);

                  logger.info(
                    `Corrected TMDB ID to ${validTmdbId} using IMDb ID ${entry.media.imdbId}`,
                    { label: 'Tracking Routes' }
                  );
                } catch (imdbError) {
                  throw error; // Re-throw original error
                }
              } else {
                throw error;
              }
            }
          }
        } else if (entry.mediaType === MediaType.TV) {
          // Try tmdbId first
          if (entry.media.tmdbId) {
            try {
              const tvDetails = await tmdb.getTvShow({
                tvId: entry.media.tmdbId,
              });
              title = tvDetails.name;
              posterPath = tvDetails.poster_path;
              backdropPath = tvDetails.backdrop_path;
            } catch (error) {
              // Invalid TMDB ID - try to correct it using TVDb ID
              logger.warn(
                `Invalid TMDB ID ${entry.media.tmdbId} for TV show ${entry.media.id}, attempting correction`,
                { label: 'Tracking Routes' }
              );

              if (entry.media.tvdbId) {
                try {
                  const tvDetails = await tmdb.getShowByTvdbId({
                    tvdbId: entry.media.tvdbId,
                  });
                  validTmdbId = tvDetails.id;
                  title = tvDetails.name;
                  posterPath = tvDetails.poster_path;
                  backdropPath = tvDetails.backdrop_path;

                  // Update the media entity with correct TMDB ID
                  const mediaRepository = getRepository(Media);
                  entry.media.tmdbId = validTmdbId;
                  await mediaRepository.save(entry.media);

                  logger.info(
                    `Corrected TMDB ID to ${validTmdbId} using TVDb ID ${entry.media.tvdbId}`,
                    { label: 'Tracking Routes' }
                  );
                } catch (tvdbError) {
                  // Try IMDb ID as last resort
                  if (entry.media.imdbId) {
                    try {
                      const correctedMedia = await tmdb.getMediaByImdbId({
                        imdbId: entry.media.imdbId,
                      });
                      validTmdbId = correctedMedia.id;
                      title = (correctedMedia as any).name;
                      posterPath = (correctedMedia as any).poster_path;
                      backdropPath = (correctedMedia as any).backdrop_path;

                      // Update the media entity with correct TMDB ID
                      const mediaRepository = getRepository(Media);
                      entry.media.tmdbId = validTmdbId;
                      await mediaRepository.save(entry.media);

                      logger.info(
                        `Corrected TMDB ID to ${validTmdbId} using IMDb ID ${entry.media.imdbId}`,
                        { label: 'Tracking Routes' }
                      );
                    } catch (imdbError) {
                      throw error; // Re-throw original error
                    }
                  } else {
                    throw error;
                  }
                }
              } else {
                throw error;
              }
            }
          } else if (entry.media.tvdbId) {
            // No TMDB ID but have TVDb ID - use it to get correct TMDB ID
            const tvDetails = await tmdb.getShowByTvdbId({
              tvdbId: entry.media.tvdbId,
            });
            validTmdbId = tvDetails.id;
            title = tvDetails.name;
            posterPath = tvDetails.poster_path;
            backdropPath = tvDetails.backdrop_path;

            // Update the media entity with correct TMDB ID
            const mediaRepository = getRepository(Media);
            entry.media.tmdbId = validTmdbId;
            await mediaRepository.save(entry.media);

            logger.info(
              `Set TMDB ID to ${validTmdbId} using TVDb ID ${entry.media.tvdbId}`,
              { label: 'Tracking Routes' }
            );
          }
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
            tmdbId: validTmdbId,
            tvdbId: entry.media.tvdbId,
            mediaType: entry.media.mediaType,
            title,
            posterPath,
            backdropPath,
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
                tvdbId: entry.media.tvdbId,
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
        let backdropPath: string | undefined;
        let validTmdbId = review.media.tmdbId;

        if (review.mediaType === MediaType.MOVIE) {
          if (review.media.tmdbId) {
            try {
              const movieDetails = await tmdb.getMovie({
                movieId: review.media.tmdbId,
              });
              title = movieDetails.title;
              posterPath = movieDetails.poster_path;
              backdropPath = movieDetails.backdrop_path;
            } catch (error) {
              // Invalid TMDB ID - try to correct it using IMDb ID
              logger.warn(
                `Invalid TMDB ID ${review.media.tmdbId} for movie ${review.media.id}, attempting correction`,
                { label: 'Tracking Routes' }
              );

              if (review.media.imdbId) {
                try {
                  const correctedMedia = await tmdb.getMediaByImdbId({
                    imdbId: review.media.imdbId,
                  });
                  validTmdbId = correctedMedia.id;
                  title = (correctedMedia as any).title;
                  posterPath = (correctedMedia as any).poster_path;
                  backdropPath = (correctedMedia as any).backdrop_path;

                  // Update the media entity with correct TMDB ID
                  const mediaRepository = getRepository(Media);
                  review.media.tmdbId = validTmdbId;
                  await mediaRepository.save(review.media);

                  logger.info(
                    `Corrected TMDB ID to ${validTmdbId} using IMDb ID ${review.media.imdbId}`,
                    { label: 'Tracking Routes' }
                  );
                } catch (imdbError) {
                  throw error; // Re-throw original error
                }
              } else {
                throw error;
              }
            }
          }
        } else if (review.mediaType === MediaType.TV) {
          // Try tmdbId first
          if (review.media.tmdbId) {
            try {
              const tvDetails = await tmdb.getTvShow({
                tvId: review.media.tmdbId,
              });
              title = tvDetails.name;
              posterPath = tvDetails.poster_path;
              backdropPath = tvDetails.backdrop_path;
            } catch (error) {
              // Invalid TMDB ID - try to correct it using TVDb ID
              logger.warn(
                `Invalid TMDB ID ${review.media.tmdbId} for TV show ${review.media.id}, attempting correction`,
                { label: 'Tracking Routes' }
              );

              if (review.media.tvdbId) {
                try {
                  const tvDetails = await tmdb.getShowByTvdbId({
                    tvdbId: review.media.tvdbId,
                  });
                  validTmdbId = tvDetails.id;
                  title = tvDetails.name;
                  posterPath = tvDetails.poster_path;
                  backdropPath = tvDetails.backdrop_path;

                  // Update the media entity with correct TMDB ID
                  const mediaRepository = getRepository(Media);
                  review.media.tmdbId = validTmdbId;
                  await mediaRepository.save(review.media);

                  logger.info(
                    `Corrected TMDB ID to ${validTmdbId} using TVDb ID ${review.media.tvdbId}`,
                    { label: 'Tracking Routes' }
                  );
                } catch (tvdbError) {
                  // Try IMDb ID as last resort
                  if (review.media.imdbId) {
                    try {
                      const correctedMedia = await tmdb.getMediaByImdbId({
                        imdbId: review.media.imdbId,
                      });
                      validTmdbId = correctedMedia.id;
                      title = (correctedMedia as any).name;
                      posterPath = (correctedMedia as any).poster_path;
                      backdropPath = (correctedMedia as any).backdrop_path;

                      // Update the media entity with correct TMDB ID
                      const mediaRepository = getRepository(Media);
                      review.media.tmdbId = validTmdbId;
                      await mediaRepository.save(review.media);

                      logger.info(
                        `Corrected TMDB ID to ${validTmdbId} using IMDb ID ${review.media.imdbId}`,
                        { label: 'Tracking Routes' }
                      );
                    } catch (imdbError) {
                      throw error; // Re-throw original error
                    }
                  } else {
                    throw error;
                  }
                }
              } else {
                throw error;
              }
            }
          } else if (review.media.tvdbId) {
            // No TMDB ID but have TVDb ID - use it to get correct TMDB ID
            const tvDetails = await tmdb.getShowByTvdbId({
              tvdbId: review.media.tvdbId,
            });
            validTmdbId = tvDetails.id;
            title = tvDetails.name;
            posterPath = tvDetails.poster_path;
            backdropPath = tvDetails.backdrop_path;

            // Update the media entity with correct TMDB ID
            const mediaRepository = getRepository(Media);
            review.media.tmdbId = validTmdbId;
            await mediaRepository.save(review.media);

            logger.info(
              `Set TMDB ID to ${validTmdbId} using TVDb ID ${review.media.tvdbId}`,
              { label: 'Tracking Routes' }
            );
          }
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
            tmdbId: validTmdbId,
            tvdbId: review.media.tvdbId,
            mediaType: review.media.mediaType,
            title,
            posterPath,
            backdropPath,
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
                tvdbId: review.media.tvdbId,
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
const createReviewSchema = z
  .object({
    mediaId: z.number().int().positive().optional(), // Internal media ID (legacy)
    tmdbId: z.number().int().positive().optional(), // TMDB ID (preferred)
    mediaType: z.enum(['movie', 'tv']),
    seasonNumber: z.number().int().positive().optional(),
    rating: z.number().int().min(1).max(10).optional(),
    content: z.string().max(5000).optional(),
    containsSpoilers: z.boolean().default(false),
    isPublic: z.boolean().default(true),
    watchedAt: z.string().datetime().optional(),
  })
  .refine((data) => data.mediaId || data.tmdbId, {
    message: 'Either mediaId or tmdbId must be provided',
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
 * POST /api/v1/tracking/watch
 * Manually add a watch entry
 */
const addWatchSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  seasonNumber: z.number().int().positive().optional(),
  episodeNumber: z.number().int().positive().optional(),
  runtimeMinutes: z.number().int().positive().optional(),
  watchedAt: z.string().datetime().optional(),
});

trackingRoutes.post('/watch', isAuthenticated(), async (req, res, next) => {
  try {
    const validatedBody = addWatchSchema.parse(req.body);
    const user = req.user as User;

    const mediaRepository = getRepository(Media);
    const watchHistoryRepository = getRepository(WatchHistory);
    const dailyActivityRepository = getRepository(DailyActivity);

    // Find the media
    const media = await mediaRepository.findOne({
      where: { id: validatedBody.mediaId },
    });

    if (!media) {
      return next({
        status: 404,
        message: 'Media not found.',
      });
    }

    // Create watch entry
    const watchDate = validatedBody.watchedAt
      ? new Date(validatedBody.watchedAt)
      : new Date();

    const watchEntry = new WatchHistory({
      userId: user.id,
      mediaId: validatedBody.mediaId,
      mediaType:
        validatedBody.mediaType === 'movie' ? MediaType.MOVIE : MediaType.TV,
      seasonNumber: validatedBody.seasonNumber,
      episodeNumber: validatedBody.episodeNumber,
      runtimeMinutes: validatedBody.runtimeMinutes,
      watchedAt: watchDate,
    });

    await watchHistoryRepository.save(watchEntry);

    // Record daily activity for streak tracking
    const activityDate = `${watchDate.getFullYear()}-${String(
      watchDate.getMonth() + 1
    ).padStart(2, '0')}-${String(watchDate.getDate()).padStart(2, '0')}`;

    let activity = await dailyActivityRepository.findOne({
      where: {
        userId: user.id,
        activityDate,
      },
    });

    if (activity) {
      activity.totalMinutesWatched += validatedBody.runtimeMinutes || 0;
      activity.sessionsCount += 1;
      activity.hasCompletedWatch = true;
    } else {
      activity = new DailyActivity({
        userId: user.id,
        activityDate,
        totalMinutesWatched: validatedBody.runtimeMinutes || 0,
        sessionsCount: 1,
        hasCompletedWatch: true,
      });
    }

    await dailyActivityRepository.save(activity);

    // Update series progress for TV shows
    if (validatedBody.mediaType === 'tv' && media.tmdbId) {
      seriesProgressService
        .updateProgress(user.id, validatedBody.mediaId, media.tmdbId)
        .catch((error) => {
          logger.error('Failed to update series progress', {
            label: 'Tracking Routes',
            userId: user.id,
            mediaId: validatedBody.mediaId,
            error: error.message,
          });
        });
    }

    // Award badges for the new watch
    await badgeService.checkAndAwardBadges(user.id);

    logger.info(`User ${user.id} manually added watch entry`, {
      label: 'Tracking Routes',
      mediaId: validatedBody.mediaId,
      mediaType: validatedBody.mediaType,
    });

    return res.status(201).json(watchEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next({
        status: 400,
        message: 'Invalid request body.',
        errors: error.errors,
      });
    }

    logger.error('Failed to add watch entry', {
      label: 'Tracking Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to add watch entry.',
    });
  }
});

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

    // Get or create media - use tmdbId to find existing media
    const mediaRepository = getRepository(Media);
    let media: Media | null = null;

    // First try to find by tmdbId (preferred)
    if (validatedBody.tmdbId) {
      media = await mediaRepository.findOne({
        where: {
          tmdbId: validatedBody.tmdbId,
          mediaType: validatedBody.mediaType as MediaType,
        },
      });

      // If not found, create it
      if (!media) {
        media = new Media({
          tmdbId: validatedBody.tmdbId,
          mediaType: validatedBody.mediaType as MediaType,
        });
        await mediaRepository.save(media);

        logger.info(`Created new media entry for review`, {
          label: 'Tracking Routes',
          mediaId: media.id,
          tmdbId: media.tmdbId,
          mediaType: media.mediaType,
        });
      }
    } else {
      // Fallback: try to find by internal id (legacy support)
      media = await mediaRepository.findOne({
        where: {
          id: validatedBody.mediaId,
          mediaType: validatedBody.mediaType as MediaType,
        },
      });
    }

    if (!media) {
      return next({
        status: 404,
        message: 'Media not found. Please provide tmdbId to create it.',
      });
    }

    const reviewRepository = getRepository(MediaReview);

    // Check if review already exists (use internal media.id)
    const existingReview = await reviewRepository.findOne({
      where: {
        userId: user.id,
        mediaId: media.id,
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
      // Create new review (use internal media.id)
      review = new MediaReview({
        userId: user.id,
        mediaId: media.id,
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

      // Check for new badges on review creation (async, don't wait)
      badgeService.checkAndAwardBadges(user.id).catch((error) => {
        logger.error('Failed to check badges after review creation', {
          label: 'Tracking Routes',
          userId: user.id,
          error: error.message,
        });
      });
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
 * GET /api/v1/tracking/reviews/feed
 * Get public reviews feed from the community
 * NOTE: This route MUST be defined before /reviews/:tmdbId/me to avoid conflicts
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
          .addSelect('COUNT(likes.id)', 'likeCount')
          .andWhere('review.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
          .groupBy('review.id')
          .orderBy('likeCount', 'DESC')
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

/**
 * GET /api/v1/tracking/reviews/:tmdbId/me
 * Get current user's review for a specific media (by TMDB ID)
 */
trackingRoutes.get<{ tmdbId: string }>(
  '/reviews/:tmdbId/me',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const tmdbId = Number(req.params.tmdbId);
      const mediaType = req.query.mediaType as MediaType;
      const seasonNumber = req.query.seasonNumber
        ? Number(req.query.seasonNumber)
        : null;
      const user = req.user as User;

      if (!mediaType || !['movie', 'tv'].includes(mediaType)) {
        return next({
          status: 400,
          message: 'Invalid or missing mediaType parameter.',
        });
      }

      // First find the media by TMDB ID
      const mediaRepository = getRepository(Media);
      const media = await mediaRepository.findOne({
        where: {
          tmdbId,
          mediaType,
        },
      });

      if (!media) {
        // No media = no review exists yet, return null (not an error)
        return res.status(200).json(null);
      }

      const reviewRepository = getRepository(MediaReview);
      const review = await reviewRepository.findOne({
        where: {
          userId: user.id,
          mediaId: media.id,
          seasonNumber: seasonNumber ?? IsNull(),
        },
      });

      // Return null if no review exists (not an error, just no review yet)
      return res.status(200).json(review || null);
    } catch (error) {
      logger.error('Failed to retrieve user review', {
        label: 'Tracking Routes',
        error: error.message,
        tmdbId: req.params.tmdbId,
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
 * Helper function to get the start of the week (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/v1/tracking/stats/:userId/activity-chart
 * Get daily watch activity for the last 3 months
 * NOTE: This route must be defined BEFORE /stats/:userId to avoid route conflicts
 */
trackingRoutes.get<{ userId: string }>(
  '/stats/:userId/activity-chart',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const view = (req.query.view as string) || 'daily'; // 'daily' or 'weekly'

      const watchHistoryRepository = getRepository(WatchHistory);

      // Get date 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      // Get all watches in the last 3 months
      const watches = await watchHistoryRepository
        .createQueryBuilder('watch')
        .select('watch.watchedAt', 'watchedAt')
        .addSelect('watch.mediaType', 'mediaType')
        .where('watch.userId = :userId', { userId })
        .andWhere('watch.watchedAt >= :startDate', {
          startDate: threeMonthsAgo,
        })
        .orderBy('watch.watchedAt', 'ASC')
        .getRawMany();

      logger.debug('Activity chart data fetched', {
        label: 'Tracking Routes',
        userId,
        view,
        watchCount: watches.length,
        startDate: threeMonthsAgo.toISOString(),
        sampleWatches: watches.slice(0, 3),
      });

      // Group by date or week
      const activityMap = new Map<
        string,
        { movies: number; episodes: number; total: number }
      >();

      // Initialize all dates/weeks in the range
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (view === 'weekly') {
        // Initialize weeks
        const currentDate = new Date(threeMonthsAgo);
        while (currentDate <= today) {
          const weekStart = getWeekStart(currentDate);
          const weekKey = weekStart.toISOString().split('T')[0];
          if (!activityMap.has(weekKey)) {
            activityMap.set(weekKey, { movies: 0, episodes: 0, total: 0 });
          }
          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else {
        // Initialize days
        const currentDate = new Date(threeMonthsAgo);
        while (currentDate <= today) {
          const dateKey = currentDate.toISOString().split('T')[0];
          activityMap.set(dateKey, { movies: 0, episodes: 0, total: 0 });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Count watches per day/week
      for (const watch of watches) {
        const watchDate = new Date(watch.watchedAt);
        let dateKey: string;

        if (view === 'weekly') {
          const weekStart = getWeekStart(watchDate);
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          dateKey = watchDate.toISOString().split('T')[0];
        }

        const entry = activityMap.get(dateKey);
        if (entry) {
          entry.total++;
          if (watch.mediaType === MediaType.MOVIE) {
            entry.movies++;
          } else {
            entry.episodes++;
          }
        }
      }

      // Convert to array and sort by date
      const activityData = Array.from(activityMap.entries())
        .map(([date, counts]) => ({
          date,
          ...counts,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return res.status(200).json({
        userId,
        view,
        startDate: threeMonthsAgo.toISOString(),
        endDate: today.toISOString(),
        data: activityData,
      });
    } catch (error) {
      logger.error('Failed to retrieve activity chart data', {
        label: 'Tracking Routes',
        error: error.message,
        userId: req.params.userId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve activity chart data.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/stats/:userId/watch-time
 * Get total watch time based on Jellyfin runtime data
 * NOTE: This route must be defined BEFORE /stats/:userId to avoid route conflicts
 */
trackingRoutes.get<{ userId: string }>(
  '/stats/:userId/watch-time',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      const watchHistoryRepository = getRepository(WatchHistory);

      // Get total runtime from Jellyfin data (stored in runtimeMinutes)
      const result = await watchHistoryRepository
        .createQueryBuilder('watch')
        .select('SUM(watch.runtimeMinutes)', 'totalMinutes')
        .addSelect(
          'COUNT(CASE WHEN watch.mediaType = :movie THEN 1 END)',
          'movieCount'
        )
        .addSelect(
          'COUNT(CASE WHEN watch.episodeNumber IS NOT NULL THEN 1 END)',
          'episodeCount'
        )
        .addSelect(
          'SUM(CASE WHEN watch.mediaType = :movie THEN watch.runtimeMinutes ELSE 0 END)',
          'movieMinutes'
        )
        .addSelect(
          'SUM(CASE WHEN watch.episodeNumber IS NOT NULL THEN watch.runtimeMinutes ELSE 0 END)',
          'episodeMinutes'
        )
        .where('watch.userId = :userId', { userId })
        .setParameter('movie', MediaType.MOVIE)
        .getRawOne();

      const totalMinutes = parseInt(result.totalMinutes) || 0;
      const movieCount = parseInt(result.movieCount) || 0;
      const episodeCount = parseInt(result.episodeCount) || 0;

      // Convert to various units
      const totalSeconds = totalMinutes * 60;
      const hours = Math.floor(totalMinutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      // Formatted breakdown (remaining after conversion)
      const remainingAfterYears = days % 365;
      const remainingMonths = Math.floor(remainingAfterYears / 30);
      const remainingDays = remainingAfterYears % 30;
      const remainingHours = hours % 24;
      const remainingMinutes = totalMinutes % 60;

      return res.status(200).json({
        userId,
        totalMinutes,
        breakdown: {
          years,
          months: remainingMonths,
          days: remainingDays,
          hours: remainingHours,
          minutes: remainingMinutes,
          seconds: 0,
        },
        totals: {
          seconds: totalSeconds,
          minutes: totalMinutes,
          hours,
          days,
          months,
          years,
        },
        watchCounts: {
          movies: movieCount,
          episodes: episodeCount,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve watch time', {
        label: 'Tracking Routes',
        error: error.message,
        userId: req.params.userId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve watch time.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/stats/:userId/streak
 * Get user's watch streak (consecutive days with activity)
 * Uses DailyActivity table which includes partial watches
 * NOTE: This route must be defined BEFORE /stats/:userId to avoid route conflicts
 */
trackingRoutes.get<{ userId: string }>(
  '/stats/:userId/streak',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      const dailyActivityRepository = getRepository(DailyActivity);

      // Get all activity dates (ordered desc)
      // DailyActivity.activityDate is already stored as YYYY-MM-DD string
      const activityDates = await dailyActivityRepository
        .createQueryBuilder('activity')
        .select('activity.activityDate', 'activityDate')
        .where('activity.userId = :userId', { userId })
        .orderBy('activity.activityDate', 'DESC')
        .getRawMany();

      if (activityDates.length === 0) {
        return res.status(200).json({
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastWatchDate: null,
          streakActive: false,
        });
      }

      // Helper to format date as YYYY-MM-DD in local timezone
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Dates are already in YYYY-MM-DD format
      const dates = activityDates.map((d) => d.activityDate);

      // Calculate current streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatLocalDate(today);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatLocalDate(yesterday);

      // Check if streak is active (had activity today or yesterday)
      const lastWatchDate = dates[0];
      const streakActive =
        lastWatchDate === todayStr || lastWatchDate === yesterdayStr;

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      // Start calculating streak
      if (streakActive) {
        currentStreak = 1;
        const checkDate = new Date(lastWatchDate);

        for (let i = 1; i < dates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDateStr = formatLocalDate(checkDate);

          if (dates[i] === expectedDateStr) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);

        // Check if dates are consecutive (1 day apart)
        const diffTime = prevDate.getTime() - currDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return res.status(200).json({
        userId,
        currentStreak,
        longestStreak,
        lastWatchDate,
        streakActive,
      });
    } catch (error) {
      logger.error('Failed to retrieve watch streak', {
        label: 'Tracking Routes',
        error: error.message,
        userId: req.params.userId,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve watch streak.',
      });
    }
  }
);

/**
 * GET /api/v1/tracking/stats/:userId
 * Get user statistics
 * NOTE: This route must be defined AFTER specific /stats/:userId/* routes
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
 * POST /api/v1/tracking/seed-test-data
 * Generate test data for watch tracking (streaks, activity chart, watch time)
 * ADMIN ONLY - For development/testing purposes
 */
trackingRoutes.post(
  '/seed-test-data',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const user = req.user as User;

      // Check admin permission
      if (!user.hasPermission(2)) {
        // Permission.ADMIN = 2
        return next({
          status: 403,
          message: 'Only administrators can seed test data.',
        });
      }

      const seedSchema = z.object({
        days: z.number().int().positive().max(365).default(90),
        clearExisting: z.boolean().default(false),
        targetUserId: z.number().int().positive().optional(),
      });

      const { days, clearExisting, targetUserId } = seedSchema.parse(req.body);
      const seedUserId = targetUserId || user.id;

      const watchHistoryRepository = getRepository(WatchHistory);
      const reviewRepository = getRepository(MediaReview);
      const mediaRepository = getRepository(Media);

      // Clear existing data if requested
      if (clearExisting) {
        await watchHistoryRepository.delete({ userId: seedUserId });
        await reviewRepository.delete({ userId: seedUserId });
        logger.info(`Cleared existing tracking data for user ${seedUserId}`, {
          label: 'Tracking Routes - Seed',
        });
      }

      // Get existing media from the database
      const existingMedia = await mediaRepository.find({
        take: 100,
        order: { id: 'DESC' },
      });

      if (existingMedia.length === 0) {
        return next({
          status: 400,
          message:
            'No media found in database. Please add some media first (request movies/shows).',
        });
      }

      // Separate movies and TV shows
      const movies = existingMedia.filter(
        (m) => m.mediaType === MediaType.MOVIE
      );
      const tvShows = existingMedia.filter((m) => m.mediaType === MediaType.TV);

      logger.info(
        `Found ${movies.length} movies and ${tvShows.length} TV shows for seeding`,
        { label: 'Tracking Routes - Seed' }
      );

      // Generate watch history over the specified period
      const watchHistoryEntries: WatchHistory[] = [];
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Create intentional streak patterns
      // Pattern 1: Recent streak (last 7-14 days)
      // Pattern 2: Streak 30-40 days ago (7-10 days)
      // Pattern 3: Scattered watches in between

      const streakPatterns = [
        { startDaysAgo: 0, length: Math.floor(Math.random() * 8) + 7 }, // 7-14 days recent
        {
          startDaysAgo: 30 + Math.floor(Math.random() * 10),
          length: Math.floor(Math.random() * 4) + 7,
        }, // 7-10 days around day 30-40
        {
          startDaysAgo: 60 + Math.floor(Math.random() * 10),
          length: Math.floor(Math.random() * 3) + 5,
        }, // 5-7 days around day 60-70
      ];

      // Track which days have watches
      const watchDays = new Set<string>();

      // Add streak days
      for (const pattern of streakPatterns) {
        for (let i = 0; i < pattern.length; i++) {
          const dayOffset = pattern.startDaysAgo + i;
          if (dayOffset <= days) {
            const date = new Date(today);
            date.setDate(date.getDate() - dayOffset);
            watchDays.add(date.toISOString().split('T')[0]);
          }
        }
      }

      // Add random scattered watches (~40% of remaining days)
      for (let dayOffset = 0; dayOffset <= days; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        const dateStr = date.toISOString().split('T')[0];

        if (!watchDays.has(dateStr) && Math.random() < 0.4) {
          watchDays.add(dateStr);
        }
      }

      // Create watch entries for each day
      for (const dateStr of watchDays) {
        const watchDate = new Date(dateStr);
        // Random time during the day
        watchDate.setHours(
          Math.floor(Math.random() * 14) + 8, // 8am - 10pm
          Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 60)
        );

        // 1-3 watches per day
        const watchesPerDay = Math.floor(Math.random() * 3) + 1;

        for (let w = 0; w < watchesPerDay; w++) {
          // 60% movies, 40% episodes
          const isMovie = Math.random() < 0.6;

          if (isMovie && movies.length > 0) {
            const movie = movies[Math.floor(Math.random() * movies.length)];
            const runtime = Math.floor(Math.random() * 90) + 90; // 90-180 min

            watchHistoryEntries.push(
              new WatchHistory({
                userId: seedUserId,
                mediaId: movie.id,
                mediaType: MediaType.MOVIE,
                runtimeMinutes: runtime,
                watchedAt: new Date(watchDate.getTime() + w * 1000 * 60 * 60), // Offset by hours
              })
            );
          } else if (tvShows.length > 0) {
            const tvShow = tvShows[Math.floor(Math.random() * tvShows.length)];
            const runtime = Math.floor(Math.random() * 40) + 20; // 20-60 min

            watchHistoryEntries.push(
              new WatchHistory({
                userId: seedUserId,
                mediaId: tvShow.id,
                mediaType: MediaType.TV,
                seasonNumber: Math.floor(Math.random() * 5) + 1,
                episodeNumber: Math.floor(Math.random() * 20) + 1,
                runtimeMinutes: runtime,
                watchedAt: new Date(watchDate.getTime() + w * 1000 * 60 * 60),
              })
            );
          }
        }
      }

      // Save watch history in batches
      const batchSize = 50;
      for (let i = 0; i < watchHistoryEntries.length; i += batchSize) {
        const batch = watchHistoryEntries.slice(i, i + batchSize);
        await watchHistoryRepository.save(batch);
      }

      logger.info(
        `Created ${watchHistoryEntries.length} watch history entries for user ${seedUserId}`,
        { label: 'Tracking Routes - Seed' }
      );

      // Generate reviews (10-15 reviews)
      const reviewCount = Math.floor(Math.random() * 6) + 10;
      const reviewsCreated: MediaReview[] = [];
      const reviewedMediaIds = new Set<number>();

      // Sample review contents
      const reviewContents = [
        'Absolutely loved this! The cinematography was stunning and the story kept me engaged throughout.',
        'Decent watch but nothing special. Some good moments but the pacing felt off.',
        'A masterpiece. This will definitely be one of my all-time favorites.',
        'Not my cup of tea. The plot was predictable and the characters felt flat.',
        'Really entertaining! Perfect for a relaxing evening.',
        'Exceeded my expectations. The character development was excellent.',
        'Good but not great. Worth watching once.',
        'Brilliant storytelling and amazing performances from the entire cast.',
        'A bit slow at times but the ending made it all worth it.',
        'One of the best I have seen this year. Highly recommended!',
        null, // Some reviews without content (rating only)
        null,
        null,
      ];

      for (let i = 0; i < reviewCount && i < existingMedia.length; i++) {
        // Pick a media that hasn't been reviewed yet
        let media =
          existingMedia[Math.floor(Math.random() * existingMedia.length)];
        let attempts = 0;
        while (reviewedMediaIds.has(media.id) && attempts < 20) {
          media =
            existingMedia[Math.floor(Math.random() * existingMedia.length)];
          attempts++;
        }

        if (reviewedMediaIds.has(media.id)) continue;
        reviewedMediaIds.add(media.id);

        // Random rating (weighted toward higher ratings)
        const ratingWeights = [1, 2, 5, 10, 15, 20, 25, 30, 35, 40]; // Higher ratings more likely
        let ratingSum = 0;
        const rand = Math.random() * ratingWeights.reduce((a, b) => a + b, 0);
        let rating = 1;
        for (let r = 0; r < ratingWeights.length; r++) {
          ratingSum += ratingWeights[r];
          if (rand <= ratingSum) {
            rating = r + 1;
            break;
          }
        }

        // Random date within the period
        const reviewDate = new Date(today);
        reviewDate.setDate(
          reviewDate.getDate() - Math.floor(Math.random() * days)
        );

        const content =
          reviewContents[Math.floor(Math.random() * reviewContents.length)];

        const review = new MediaReview({
          userId: seedUserId,
          mediaId: media.id,
          mediaType: media.mediaType,
          rating,
          content: content || undefined,
          containsSpoilers: Math.random() < 0.2, // 20% chance of spoilers
          isPublic: Math.random() < 0.8, // 80% public
          watchedAt: reviewDate,
        });

        try {
          await reviewRepository.save(review);
          reviewsCreated.push(review);
        } catch (err) {
          // Skip if duplicate (unique constraint)
          logger.debug(`Skipped duplicate review for media ${media.id}`, {
            label: 'Tracking Routes - Seed',
          });
        }
      }

      logger.info(
        `Created ${reviewsCreated.length} reviews for user ${seedUserId}`,
        { label: 'Tracking Routes - Seed' }
      );

      // Check and award badges after seeding
      const newBadges = await badgeService.checkAndAwardBadges(seedUserId);
      logger.info(`Awarded ${newBadges.length} badges to user ${seedUserId}`, {
        label: 'Tracking Routes - Seed',
        badges: newBadges.map((b) => b.badgeType),
      });

      // Calculate summary stats
      const totalWatchMinutes = watchHistoryEntries.reduce(
        (sum, w) => sum + (w.runtimeMinutes || 0),
        0
      );
      const movieCount = watchHistoryEntries.filter(
        (w) => w.mediaType === MediaType.MOVIE
      ).length;
      const episodeCount = watchHistoryEntries.filter(
        (w) => w.mediaType === MediaType.TV
      ).length;

      return res.status(201).json({
        success: true,
        message: 'Test data seeded successfully',
        summary: {
          userId: seedUserId,
          periodDays: days,
          watchHistory: {
            totalEntries: watchHistoryEntries.length,
            movies: movieCount,
            episodes: episodeCount,
            totalMinutes: totalWatchMinutes,
            totalHours: Math.round(totalWatchMinutes / 60),
            daysWithActivity: watchDays.size,
          },
          reviews: {
            total: reviewsCreated.length,
            withContent: reviewsCreated.filter((r) => r.content).length,
            public: reviewsCreated.filter((r) => r.isPublic).length,
          },
          streakPatterns: streakPatterns.map((p) => ({
            startDaysAgo: p.startDaysAgo,
            length: p.length,
          })),
          badges: {
            awarded: newBadges.length,
            types: newBadges.map((b) => b.badgeType),
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next({
          status: 400,
          message: 'Invalid request body.',
          errors: error.errors,
        });
      }

      logger.error('Failed to seed test data', {
        label: 'Tracking Routes',
        error: error.message,
      });

      return next({
        status: 500,
        message: 'Unable to seed test data.',
      });
    }
  }
);

// ============================================
// Series Progress Endpoints
// ============================================

/**
 * Get series progress for a specific media
 */
trackingRoutes.get(
  '/series/:mediaId/progress',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = parseInt(req.params.mediaId);
      const user = req.user as User;

      if (isNaN(mediaId)) {
        return next({
          status: 400,
          message: 'Invalid media ID.',
        });
      }

      const mediaRepository = getRepository(Media);
      const media = await mediaRepository.findOne({
        where: { id: mediaId },
      });

      if (!media) {
        return next({
          status: 404,
          message: 'Media not found.',
        });
      }

      if (!media.tmdbId) {
        return next({
          status: 400,
          message: 'Media does not have a TMDB ID.',
        });
      }

      // Fetch TMDB data for title and poster
      const tmdb = new TheMovieDb();
      let title: string | undefined;
      let posterPath: string | undefined;
      try {
        const tvShow = await tmdb.getTvShow({ tvId: media.tmdbId });
        title = tvShow.name;
        posterPath = tvShow.poster_path || undefined;
      } catch {
        // Continue without title/poster if TMDB fails
      }

      // Get or calculate progress
      const progress = await seriesProgressService.getSeriesProgress(
        user.id,
        mediaId
      );

      if (!progress) {
        // Calculate progress on-the-fly
        const calculated = await seriesProgressService.calculateProgress(
          user.id,
          mediaId,
          media.tmdbId
        );

        return res.status(200).json({
          mediaId,
          tmdbId: media.tmdbId,
          title,
          posterPath,
          watchedEpisodes: calculated.watchedEpisodes,
          totalEpisodes: calculated.totalEpisodes,
          totalSeasons: calculated.totalSeasons,
          completionPercentage: calculated.percentage,
          status:
            calculated.watchedEpisodes === 0 ? 'not_started' : 'in_progress',
          isOngoing: calculated.isOngoing,
          isCompleted: calculated.isCompleted,
          lastWatchedAt: null,
          completedAt: null,
        });
      }

      return res.status(200).json({
        mediaId: progress.mediaId,
        tmdbId: progress.tmdbId,
        title,
        posterPath,
        watchedEpisodes: progress.watchedEpisodes,
        totalEpisodes: progress.totalEpisodes,
        totalSeasons: progress.totalSeasons,
        completionPercentage: progress.completionPercentage,
        status: progress.status,
        isOngoing: progress.isOngoing,
        isCompleted: progress.status === 'completed',
        lastWatchedAt: progress.lastWatchedAt,
        completedAt: progress.completedAt,
      });
    } catch (error) {
      logger.error('Failed to get series progress', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to get series progress.',
      });
    }
  }
);

const getSeriesProgressListSchema = z.object({
  status: z
    .enum(['all', 'in_progress', 'completed', 'abandoned'])
    .default('all'),
  sortBy: z.enum(['lastWatched', 'percentage', 'name']).default('lastWatched'),
  take: z.coerce.number().int().positive().max(100).default(20),
  skip: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Get all series progress for the current user
 */
trackingRoutes.get(
  '/series/progress',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const user = req.user as User;
      const { status, sortBy, take, skip } = getSeriesProgressListSchema.parse(
        req.query
      );

      const { results, totalCount } =
        await seriesProgressService.getUserSeriesProgress(user.id, {
          status,
          sortBy,
          limit: take,
          offset: skip,
        });

      return res.status(200).json({
        pageInfo: {
          pages: Math.ceil(totalCount / take),
          pageSize: take,
          results: totalCount,
          page: Math.floor(skip / take) + 1,
        },
        results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next({
          status: 400,
          message: 'Invalid query parameters.',
          errors: error.errors,
        });
      }

      logger.error('Failed to get series progress list', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to get series progress list.',
      });
    }
  }
);

/**
 * Mark a series as abandoned
 */
trackingRoutes.post(
  '/series/:mediaId/abandon',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = parseInt(req.params.mediaId);
      const user = req.user as User;

      if (isNaN(mediaId)) {
        return next({
          status: 400,
          message: 'Invalid media ID.',
        });
      }

      const progress = await seriesProgressService.markAsAbandoned(
        user.id,
        mediaId
      );

      if (!progress) {
        return next({
          status: 404,
          message: 'Series progress not found.',
        });
      }

      return res.status(200).json(progress);
    } catch (error) {
      logger.error('Failed to mark series as abandoned', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to mark series as abandoned.',
      });
    }
  }
);

/**
 * Resume a previously abandoned series
 */
trackingRoutes.post(
  '/series/:mediaId/resume',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const mediaId = parseInt(req.params.mediaId);
      const user = req.user as User;

      if (isNaN(mediaId)) {
        return next({
          status: 400,
          message: 'Invalid media ID.',
        });
      }

      const progress = await seriesProgressService.resumeSeries(
        user.id,
        mediaId
      );

      if (!progress) {
        return next({
          status: 404,
          message: 'Series not found or not abandoned.',
        });
      }

      return res.status(200).json(progress);
    } catch (error) {
      logger.error('Failed to resume series', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to resume series.',
      });
    }
  }
);

/**
 * Get series completion stats for a user
 */
trackingRoutes.get(
  '/stats/:userId/series-completion',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentUser = req.user as User;

      if (isNaN(userId)) {
        return next({
          status: 400,
          message: 'Invalid user ID.',
        });
      }

      // Users can only view their own stats or admins can view anyone's
      if (userId !== currentUser.id && !currentUser.hasPermission(2)) {
        return next({
          status: 403,
          message: "You do not have permission to view this user's stats.",
        });
      }

      const stats = await seriesProgressService.getUserSeriesStats(userId);

      return res.status(200).json(stats);
    } catch (error) {
      logger.error('Failed to get series completion stats', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to get series completion stats.',
      });
    }
  }
);

/**
 * Recalculate all series progress for the current user
 */
trackingRoutes.post(
  '/series/recalculate',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const user = req.user as User;

      // Run in background
      seriesProgressService.recalculateAllProgress(user.id).catch((error) => {
        logger.error('Failed to recalculate series progress', {
          label: 'Tracking Routes',
          userId: user.id,
          error: error.message,
        });
      });

      return res.status(202).json({
        message: 'Series progress recalculation started.',
      });
    } catch (error) {
      logger.error('Failed to start series progress recalculation', {
        label: 'Tracking Routes',
        error: (error as Error).message,
      });

      return next({
        status: 500,
        message: 'Unable to start series progress recalculation.',
      });
    }
  }
);

export default trackingRoutes;
