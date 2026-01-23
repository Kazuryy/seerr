import { getRepository } from '@server/datasource';
import { MediaReview } from '@server/entity/MediaReview';
import { User } from '@server/entity/User';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';

const communityRoutes = Router();

/**
 * GET /api/v1/community/leaderboard
 * Get community leaderboard
 */
communityRoutes.get(
  '/leaderboard',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const period = (req.query.period as string) || 'month';
      const metric = (req.query.metric as string) || 'reviews';
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          // First day of current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'alltime':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          return next({
            status: 400,
            message: 'Invalid period parameter.',
          });
      }

      let leaderboard: {
        userId: number;
        displayName: string;
        avatar: string;
        value: number;
      }[] = [];

      if (metric === 'reviews') {
        // Top reviewers
        const reviewRepository = getRepository(MediaReview);
        const userRepository = getRepository(User);

        const results = await reviewRepository
          .createQueryBuilder('review')
          .select('review.userId', 'userId')
          .addSelect('COUNT(review.id)', 'value')
          .where('review.createdAt >= :startDate', { startDate })
          .andWhere('review.isPublic = :isPublic', { isPublic: true })
          .groupBy('review.userId')
          .orderBy('value', 'DESC')
          .limit(limit)
          .getRawMany();

        // Fetch user data for each result
        leaderboard = await Promise.all(
          results.map(async (r) => {
            const user = await userRepository.findOne({
              where: { id: r.userId },
            });
            return {
              userId: r.userId,
              displayName: user?.displayName || 'Unknown User',
              avatar: user?.avatar || '',
              value: parseInt(r.value),
            };
          })
        );
      } else if (metric === 'likes') {
        // Most liked reviewers
        const reviewRepository = getRepository(MediaReview);
        const userRepository = getRepository(User);

        const results = await reviewRepository
          .createQueryBuilder('review')
          .select('review.userId', 'userId')
          .addSelect('COUNT(likes.id)', 'value')
          .leftJoin('review.likes', 'likes')
          .where('review.createdAt >= :startDate', { startDate })
          .andWhere('review.isPublic = :isPublic', { isPublic: true })
          .groupBy('review.userId')
          .orderBy('value', 'DESC')
          .limit(limit)
          .getRawMany();

        // Fetch user data for each result
        leaderboard = await Promise.all(
          results.map(async (r) => {
            const user = await userRepository.findOne({
              where: { id: r.userId },
            });
            return {
              userId: r.userId,
              displayName: user?.displayName || 'Unknown User',
              avatar: user?.avatar || '',
              value: parseInt(r.value),
            };
          })
        );
      } else if (metric === 'watches') {
        // Most active watchers (excluding manual entries)
        const watchHistoryRepository = getRepository(WatchHistory);
        const userRepository = getRepository(User);

        const results = await watchHistoryRepository
          .createQueryBuilder('watch')
          .select('watch.userId', 'userId')
          .addSelect('COUNT(watch.id)', 'value')
          .where('watch.watchedAt >= :startDate', { startDate })
          .andWhere('watch.isManual = :isManual', { isManual: false })
          .groupBy('watch.userId')
          .orderBy('value', 'DESC')
          .limit(limit)
          .getRawMany();

        // Fetch user data for each result
        leaderboard = await Promise.all(
          results.map(async (r) => {
            const user = await userRepository.findOne({
              where: { id: r.userId },
            });
            return {
              userId: r.userId,
              displayName: user?.displayName || 'Unknown User',
              avatar: user?.avatar || '',
              value: parseInt(r.value),
            };
          })
        );
      } else {
        return next({
          status: 400,
          message: 'Invalid metric parameter.',
        });
      }

      // Add rank to each entry
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        user: {
          id: entry.userId,
          displayName: entry.displayName,
          avatar: entry.avatar,
        },
        value: entry.value,
      }));

      return res.status(200).json({
        period,
        metric,
        leaderboard: rankedLeaderboard,
      });
    } catch (error) {
      logger.error('Failed to retrieve leaderboard', {
        label: 'Community Routes',
        error: error.message,
      });

      return next({
        status: 500,
        message: 'Unable to retrieve leaderboard.',
      });
    }
  }
);

/**
 * GET /api/v1/community/stats
 * Get community statistics
 */
communityRoutes.get('/stats', isAuthenticated(), async (req, res, next) => {
  try {
    const reviewRepository = getRepository(MediaReview);
    const watchHistoryRepository = getRepository(WatchHistory);

    // Get unique active users this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsersThisMonth,
      totalWatches,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      // Total users who have tracked at least one media (excluding manual entries)
      watchHistoryRepository
        .createQueryBuilder('watch')
        .select('COUNT(DISTINCT watch.userId)', 'count')
        .where('watch.isManual = :isManual', { isManual: false })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0')),

      // Active users this month (excluding manual entries)
      watchHistoryRepository
        .createQueryBuilder('watch')
        .select('COUNT(DISTINCT watch.userId)', 'count')
        .where('watch.watchedAt >= :oneMonthAgo', { oneMonthAgo })
        .andWhere('watch.isManual = :isManual', { isManual: false })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0')),

      // Total watches (excluding manual entries)
      watchHistoryRepository.count({ where: { isManual: false } }),

      // Total public reviews
      reviewRepository.count({
        where: { isPublic: true },
      }),

      // Average community rating
      reviewRepository
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'avgRating')
        .where('review.isPublic = :isPublic', { isPublic: true })
        .andWhere('review.rating IS NOT NULL')
        .getRawOne()
        .then((r) => (r?.avgRating ? parseFloat(r.avgRating) : undefined)),
    ]);

    // Get most watched this week (excluding manual entries)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const mostWatchedThisWeek = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('watch.mediaId', 'mediaId')
      .addSelect('media.id', 'id')
      .addSelect('media.tmdbId', 'tmdbId')
      .addSelect('media.mediaType', 'mediaType')
      .addSelect('COUNT(watch.id)', 'watchCount')
      .leftJoin('watch.media', 'media')
      .where('watch.watchedAt >= :oneWeekAgo', { oneWeekAgo })
      .andWhere('watch.isManual = :isManual', { isManual: false })
      .groupBy('watch.mediaId')
      .addGroupBy('media.id')
      .addGroupBy('media.tmdbId')
      .addGroupBy('media.mediaType')
      .orderBy('watchCount', 'DESC')
      .limit(5)
      .getRawMany();

    // Get top rated this month
    const topRatedThisMonth = await reviewRepository
      .createQueryBuilder('review')
      .select('review.mediaId', 'mediaId')
      .addSelect('media.id', 'id')
      .addSelect('media.tmdbId', 'tmdbId')
      .addSelect('media.mediaType', 'mediaType')
      .addSelect('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .leftJoin('review.media', 'media')
      .where('review.createdAt >= :oneMonthAgo', { oneMonthAgo })
      .andWhere('review.isPublic = :isPublic', { isPublic: true })
      .andWhere('review.rating IS NOT NULL')
      .groupBy('review.mediaId')
      .addGroupBy('media.id')
      .addGroupBy('media.tmdbId')
      .addGroupBy('media.mediaType')
      .having('COUNT(review.id) >= :minReviews', { minReviews: 1 })
      .orderBy('averageRating', 'DESC')
      .limit(5)
      .getRawMany();

    return res.status(200).json({
      totalUsers,
      activeUsersThisMonth,
      totalWatches,
      totalReviews,
      averageCommunityRating: avgRating,
      mostWatchedThisWeek: mostWatchedThisWeek.map((item) => ({
        id: item.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        watchCount: parseInt(item.watchCount),
      })),
      topRatedThisMonth: topRatedThisMonth.map((item) => ({
        id: item.id,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        averageRating: parseFloat(item.averageRating),
        reviewCount: parseInt(item.reviewCount),
      })),
    });
  } catch (error) {
    logger.error('Failed to retrieve community stats', {
      label: 'Community Routes',
      error: error.message,
    });

    return next({
      status: 500,
      message: 'Unable to retrieve community stats.',
    });
  }
});

export default communityRoutes;
