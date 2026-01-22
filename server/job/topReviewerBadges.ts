import { getRepository } from '@server/datasource';
import { MediaReview } from '@server/entity/MediaReview';
import { User } from '@server/entity/User';
import { BadgeType, UserBadge } from '@server/entity/UserBadge';
import badgeService from '@server/lib/badgeService';
import logger from '@server/logger';

/**
 * Award Top Reviewer of the Month badge to the current month's top reviewer
 * Removes badge from previous holder if they're no longer the top reviewer
 */
export async function awardTopReviewerMonth(): Promise<void> {
  try {
    logger.info('Starting Top Reviewer of the Month badge check', {
      label: 'Top Reviewer Job',
    });

    const reviewRepository = getRepository(MediaReview);
    const userRepository = getRepository(User);
    const badgeRepository = getRepository(UserBadge);

    // Get start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Find user with most reviews in the current month
    const topReviewer = await reviewRepository
      .createQueryBuilder('review')
      .select('review.userId', 'userId')
      .addSelect('COUNT(*)', 'reviewCount')
      .where('review.createdAt >= :startOfMonth', { startOfMonth })
      .groupBy('review.userId')
      .orderBy('reviewCount', 'DESC')
      .limit(1)
      .getRawOne();

    if (!topReviewer || parseInt(topReviewer.reviewCount) === 0) {
      logger.info('No reviews found in the current month', {
        label: 'Top Reviewer Job',
      });
      return;
    }

    const newTopReviewerId = parseInt(topReviewer.userId);
    const reviewCount = parseInt(topReviewer.reviewCount);

    // Find current badge holders
    const currentBadgeHolders = await badgeRepository.find({
      where: { badgeType: BadgeType.TOP_REVIEWER_MONTH },
    });

    // Remove badge from users who are not the current top reviewer
    for (const badge of currentBadgeHolders) {
      if (badge.userId !== newTopReviewerId) {
        await badgeRepository.remove(badge);
        logger.info('Top Reviewer of the Month badge removed', {
          label: 'Top Reviewer Job',
          userId: badge.userId,
        });
      }
    }

    // Award the badge to the current top reviewer if they don't have it
    const badge = await badgeService.awardCommunityBadge(
      newTopReviewerId,
      BadgeType.TOP_REVIEWER_MONTH
    );

    if (badge) {
      const user = await userRepository.findOne({
        where: { id: newTopReviewerId },
      });
      logger.info('Top Reviewer of the Month badge awarded', {
        label: 'Top Reviewer Job',
        userId: newTopReviewerId,
        username: user?.displayName || user?.username,
        reviewCount,
      });
    }
  } catch (error) {
    logger.error('Failed to update Top Reviewer of the Month badge', {
      label: 'Top Reviewer Job',
      error: (error as Error).message,
    });
  }
}

/**
 * Award Top Reviewer of the Year badge to the current year's top reviewer
 * Removes badge from previous holder if they're no longer the top reviewer
 */
export async function awardTopReviewerYear(): Promise<void> {
  try {
    logger.info('Starting Top Reviewer of the Year badge check', {
      label: 'Top Reviewer Job',
    });

    const reviewRepository = getRepository(MediaReview);
    const userRepository = getRepository(User);
    const badgeRepository = getRepository(UserBadge);

    // Get start of current year
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // Find user with most reviews in the current year
    const topReviewer = await reviewRepository
      .createQueryBuilder('review')
      .select('review.userId', 'userId')
      .addSelect('COUNT(*)', 'reviewCount')
      .where('review.createdAt >= :startOfYear', { startOfYear })
      .groupBy('review.userId')
      .orderBy('reviewCount', 'DESC')
      .limit(1)
      .getRawOne();

    if (!topReviewer || parseInt(topReviewer.reviewCount) === 0) {
      logger.info('No reviews found in the current year', {
        label: 'Top Reviewer Job',
      });
      return;
    }

    const newTopReviewerId = parseInt(topReviewer.userId);
    const reviewCount = parseInt(topReviewer.reviewCount);

    // Find current badge holders
    const currentBadgeHolders = await badgeRepository.find({
      where: { badgeType: BadgeType.TOP_REVIEWER_YEAR },
    });

    // Remove badge from users who are not the current top reviewer
    for (const badge of currentBadgeHolders) {
      if (badge.userId !== newTopReviewerId) {
        await badgeRepository.remove(badge);
        logger.info('Top Reviewer of the Year badge removed', {
          label: 'Top Reviewer Job',
          userId: badge.userId,
        });
      }
    }

    // Award the badge to the current top reviewer if they don't have it
    const badge = await badgeService.awardCommunityBadge(
      newTopReviewerId,
      BadgeType.TOP_REVIEWER_YEAR
    );

    if (badge) {
      const user = await userRepository.findOne({
        where: { id: newTopReviewerId },
      });
      logger.info('Top Reviewer of the Year badge awarded', {
        label: 'Top Reviewer Job',
        userId: newTopReviewerId,
        username: user?.displayName || user?.username,
        reviewCount,
      });
    }
  } catch (error) {
    logger.error('Failed to update Top Reviewer of the Year badge', {
      label: 'Top Reviewer Job',
      error: (error as Error).message,
    });
  }
}
