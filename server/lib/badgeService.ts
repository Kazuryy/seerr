import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { MediaReview } from '@server/entity/MediaReview';
import { ReviewLike } from '@server/entity/ReviewLike';
import { SeriesProgress } from '@server/entity/SeriesProgress';
import { User } from '@server/entity/User';
import { BadgeType, UserBadge } from '@server/entity/UserBadge';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';
import notificationManager, { Notification } from './notifications';

interface BadgeDefinition {
  type: BadgeType;
  displayName: string;
  description: string;
  icon: string;
  category:
    | 'watching'
    | 'reviews'
    | 'social'
    | 'streaks'
    | 'special'
    | 'community';
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  // Watching milestones - Movies
  [BadgeType.MOVIES_WATCHED_10]: {
    type: BadgeType.MOVIES_WATCHED_10,
    displayName: 'Movie Starter',
    description: 'Watched 10 movies',
    icon: '🎬',
    category: 'watching',
  },
  [BadgeType.MOVIES_WATCHED_50]: {
    type: BadgeType.MOVIES_WATCHED_50,
    displayName: 'Movie Buff',
    description: 'Watched 50 movies',
    icon: '🎥',
    category: 'watching',
  },
  [BadgeType.MOVIES_WATCHED_100]: {
    type: BadgeType.MOVIES_WATCHED_100,
    displayName: 'Century Club',
    description: 'Watched 100 movies',
    icon: '🏆',
    category: 'watching',
  },
  [BadgeType.MOVIES_WATCHED_250]: {
    type: BadgeType.MOVIES_WATCHED_250,
    displayName: 'Movie Marathon Master',
    description: 'Watched 250 movies',
    icon: '🎭',
    category: 'watching',
  },
  [BadgeType.MOVIES_WATCHED_500]: {
    type: BadgeType.MOVIES_WATCHED_500,
    displayName: 'Cinephile',
    description: 'Watched 500 movies',
    icon: '🎪',
    category: 'watching',
  },
  [BadgeType.MOVIES_WATCHED_1000]: {
    type: BadgeType.MOVIES_WATCHED_1000,
    displayName: 'Movie Legend',
    description: 'Watched 1000 movies',
    icon: '👑',
    category: 'watching',
  },

  // Watching milestones - TV Episodes
  [BadgeType.TV_EPISODES_100]: {
    type: BadgeType.TV_EPISODES_100,
    displayName: 'Episode Explorer',
    description: 'Watched 100 episodes',
    icon: '📺',
    category: 'watching',
  },
  [BadgeType.TV_EPISODES_500]: {
    type: BadgeType.TV_EPISODES_500,
    displayName: 'Series Regular',
    description: 'Watched 500 episodes',
    icon: '📡',
    category: 'watching',
  },
  [BadgeType.TV_EPISODES_1000]: {
    type: BadgeType.TV_EPISODES_1000,
    displayName: 'Binge Master',
    description: 'Watched 1000 episodes',
    icon: '🍿',
    category: 'watching',
  },
  [BadgeType.TV_EPISODES_5000]: {
    type: BadgeType.TV_EPISODES_5000,
    displayName: 'TV Addict',
    description: 'Watched 5000 episodes',
    icon: '📻',
    category: 'watching',
  },

  // Series completion milestones
  [BadgeType.SERIES_COMPLETED_1]: {
    type: BadgeType.SERIES_COMPLETED_1,
    displayName: 'Series Finisher',
    description: 'Completed your first series',
    icon: '📺',
    category: 'watching',
  },
  [BadgeType.SERIES_COMPLETED_5]: {
    type: BadgeType.SERIES_COMPLETED_5,
    displayName: 'Series Collector',
    description: 'Completed 5 series',
    icon: '🎬',
    category: 'watching',
  },
  [BadgeType.SERIES_COMPLETED_10]: {
    type: BadgeType.SERIES_COMPLETED_10,
    displayName: 'Series Enthusiast',
    description: 'Completed 10 series',
    icon: '🏅',
    category: 'watching',
  },
  [BadgeType.SERIES_COMPLETED_25]: {
    type: BadgeType.SERIES_COMPLETED_25,
    displayName: 'Series Master',
    description: 'Completed 25 series',
    icon: '🏆',
    category: 'watching',
  },
  [BadgeType.SERIES_COMPLETED_50]: {
    type: BadgeType.SERIES_COMPLETED_50,
    displayName: 'Series Legend',
    description: 'Completed 50 series',
    icon: '👑',
    category: 'watching',
  },

  // Review milestones
  [BadgeType.REVIEWS_WRITTEN_1]: {
    type: BadgeType.REVIEWS_WRITTEN_1,
    displayName: 'First Review',
    description: 'Wrote your first review',
    icon: '✍️',
    category: 'reviews',
  },
  [BadgeType.REVIEWS_WRITTEN_10]: {
    type: BadgeType.REVIEWS_WRITTEN_10,
    displayName: 'Reviewer',
    description: 'Wrote 10 reviews',
    icon: '📝',
    category: 'reviews',
  },
  [BadgeType.REVIEWS_WRITTEN_50]: {
    type: BadgeType.REVIEWS_WRITTEN_50,
    displayName: 'Prolific Reviewer',
    description: 'Wrote 50 reviews',
    icon: '📖',
    category: 'reviews',
  },
  [BadgeType.REVIEWS_WRITTEN_100]: {
    type: BadgeType.REVIEWS_WRITTEN_100,
    displayName: 'Top Reviewer',
    description: 'Wrote 100 reviews',
    icon: '⭐',
    category: 'reviews',
  },

  // Social engagement
  [BadgeType.REVIEW_LIKES_RECEIVED_1]: {
    type: BadgeType.REVIEW_LIKES_RECEIVED_1,
    displayName: 'First Like',
    description: 'Received your first like',
    icon: '👍',
    category: 'social',
  },
  [BadgeType.REVIEW_LIKES_RECEIVED_50]: {
    type: BadgeType.REVIEW_LIKES_RECEIVED_50,
    displayName: 'Popular Opinion',
    description: 'Received 50 likes',
    icon: '💖',
    category: 'social',
  },
  [BadgeType.REVIEW_LIKES_RECEIVED_100]: {
    type: BadgeType.REVIEW_LIKES_RECEIVED_100,
    displayName: 'Influential Critic',
    description: 'Received 100 likes',
    icon: '🌟',
    category: 'social',
  },
  [BadgeType.REVIEW_LIKES_RECEIVED_500]: {
    type: BadgeType.REVIEW_LIKES_RECEIVED_500,
    displayName: 'Trendsetter',
    description: 'Received 500 likes',
    icon: '💫',
    category: 'social',
  },

  // Streaks
  [BadgeType.WATCHING_STREAK_7]: {
    type: BadgeType.WATCHING_STREAK_7,
    displayName: 'Week Warrior',
    description: '7-day watching streak',
    icon: '🔥',
    category: 'streaks',
  },
  [BadgeType.WATCHING_STREAK_30]: {
    type: BadgeType.WATCHING_STREAK_30,
    displayName: 'Monthly Master',
    description: '30-day watching streak',
    icon: '🚀',
    category: 'streaks',
  },
  [BadgeType.WATCHING_STREAK_100]: {
    type: BadgeType.WATCHING_STREAK_100,
    displayName: 'Century Streaker',
    description: '100-day watching streak',
    icon: '⚡',
    category: 'streaks',
  },

  // Special achievements
  [BadgeType.BINGE_WATCHER]: {
    type: BadgeType.BINGE_WATCHER,
    displayName: 'Binge Watcher',
    description: 'Watched full season in 24h',
    icon: '🌙',
    category: 'special',
  },
  [BadgeType.COMPLETIONIST]: {
    type: BadgeType.COMPLETIONIST,
    displayName: 'Completionist',
    description: 'Completed 10 series',
    icon: '✅',
    category: 'special',
  },
  [BadgeType.REWATCH_KING]: {
    type: BadgeType.REWATCH_KING,
    displayName: 'Rewatch Royalty',
    description: 'Rewatched 20 different items',
    icon: '🔄',
    category: 'special',
  },
  [BadgeType.EARLY_ADOPTER]: {
    type: BadgeType.EARLY_ADOPTER,
    displayName: 'Early Adopter',
    description: 'One of the first users',
    icon: '🌱',
    category: 'special',
  },
  [BadgeType.COMMUNITY_HERO]: {
    type: BadgeType.COMMUNITY_HERO,
    displayName: 'Community Hero',
    description: 'Significant community contribution',
    icon: '🦸',
    category: 'community',
  },
  [BadgeType.TOP_REVIEWER_MONTH]: {
    type: BadgeType.TOP_REVIEWER_MONTH,
    displayName: 'Top Reviewer of the Month',
    description: 'Most reviews in a month',
    icon: '🥇',
    category: 'community',
  },
  [BadgeType.TOP_REVIEWER_YEAR]: {
    type: BadgeType.TOP_REVIEWER_YEAR,
    displayName: 'Top Reviewer of the Year',
    description: 'Most reviews in a year',
    icon: '🏅',
    category: 'community',
  },
};

class BadgeService {
  /**
   * Check and award badges to a user
   */
  async checkAndAwardBadges(userId: number): Promise<UserBadge[]> {
    const newBadges: UserBadge[] = [];

    // Check movies watched
    const movieBadges = await this.checkMovieBadges(userId);
    newBadges.push(...movieBadges);

    // Check TV episodes watched
    const tvBadges = await this.checkTvBadges(userId);
    newBadges.push(...tvBadges);

    // Check reviews written
    const reviewBadges = await this.checkReviewBadges(userId);
    newBadges.push(...reviewBadges);

    // Check likes received
    const likeBadges = await this.checkLikeBadges(userId);
    newBadges.push(...likeBadges);

    // Check watching streak
    const streakBadges = await this.checkStreakBadges(userId);
    newBadges.push(...streakBadges);

    // Check special achievements
    const specialBadges = await this.checkSpecialBadges(userId);
    newBadges.push(...specialBadges);

    // Check series completion badges
    const seriesCompletionBadges = await this.checkSeriesCompletionBadges(
      userId
    );
    newBadges.push(...seriesCompletionBadges);

    // Check early adopter badge
    const earlyAdopterBadge = await this.checkEarlyAdopterBadge(userId);
    if (earlyAdopterBadge) {
      newBadges.push(earlyAdopterBadge);
    }

    return newBadges;
  }

  /**
   * Check if user already has a badge
   */
  private async hasBadge(
    userId: number,
    badgeType: BadgeType
  ): Promise<boolean> {
    const badgeRepository = getRepository(UserBadge);
    const existing = await badgeRepository.findOne({
      where: { userId, badgeType },
    });
    return !!existing;
  }

  /**
   * Award a badge to a user
   */
  private async awardBadge(
    userId: number,
    badgeType: BadgeType,
    metadata?: Record<string, unknown>
  ): Promise<UserBadge | null> {
    if (await this.hasBadge(userId, badgeType)) {
      return null;
    }

    const badgeRepository = getRepository(UserBadge);
    const badge = new UserBadge({
      userId,
      badgeType,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    await badgeRepository.save(badge);

    logger.info(`Badge ${badgeType} awarded to user ${userId}`, {
      label: 'Badge Service',
    });

    // Send notification to user
    try {
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (user) {
        const badgeDefinition = BADGE_DEFINITIONS[badgeType];
        notificationManager.sendNotification(Notification.BADGE_EARNED, {
          notifyUser: user,
          notifySystem: true,
          notifyAdmin: false,
          subject: `${badgeDefinition.icon} ${user.displayName} earned a badge: ${badgeDefinition.displayName}!`,
          message: badgeDefinition.description,
          badge: {
            type: badgeType,
            displayName: badgeDefinition.displayName,
            description: badgeDefinition.description,
            icon: badgeDefinition.icon,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to send badge notification', {
        label: 'Badge Service',
        error: (error as Error).message,
      });
    }

    return badge;
  }

  /**
   * Check movie watching badges
   */
  private async checkMovieBadges(userId: number): Promise<UserBadge[]> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const badges: UserBadge[] = [];

    // Count unique movies watched
    const movieCount = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('COUNT(DISTINCT watch.mediaId)', 'count')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: 'movie' })
      .getRawOne()
      .then((r) => parseInt(r?.count || '0'));

    const milestones = [
      { count: 10, type: BadgeType.MOVIES_WATCHED_10 },
      { count: 50, type: BadgeType.MOVIES_WATCHED_50 },
      { count: 100, type: BadgeType.MOVIES_WATCHED_100 },
      { count: 250, type: BadgeType.MOVIES_WATCHED_250 },
      { count: 500, type: BadgeType.MOVIES_WATCHED_500 },
      { count: 1000, type: BadgeType.MOVIES_WATCHED_1000 },
    ];

    for (const milestone of milestones) {
      if (movieCount >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          count: movieCount,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check TV episode watching badges
   */
  private async checkTvBadges(userId: number): Promise<UserBadge[]> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const badges: UserBadge[] = [];

    // Count episodes watched
    const episodeCount = await watchHistoryRepository.count({
      where: {
        userId,
        mediaType: MediaType.TV,
      },
    });

    const milestones = [
      { count: 100, type: BadgeType.TV_EPISODES_100 },
      { count: 500, type: BadgeType.TV_EPISODES_500 },
      { count: 1000, type: BadgeType.TV_EPISODES_1000 },
      { count: 5000, type: BadgeType.TV_EPISODES_5000 },
    ];

    for (const milestone of milestones) {
      if (episodeCount >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          count: episodeCount,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check review writing badges
   */
  private async checkReviewBadges(userId: number): Promise<UserBadge[]> {
    const reviewRepository = getRepository(MediaReview);
    const badges: UserBadge[] = [];

    const reviewCount = await reviewRepository.count({
      where: { userId },
    });

    const milestones = [
      { count: 1, type: BadgeType.REVIEWS_WRITTEN_1 },
      { count: 10, type: BadgeType.REVIEWS_WRITTEN_10 },
      { count: 50, type: BadgeType.REVIEWS_WRITTEN_50 },
      { count: 100, type: BadgeType.REVIEWS_WRITTEN_100 },
    ];

    for (const milestone of milestones) {
      if (reviewCount >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          count: reviewCount,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check like receiving badges
   */
  private async checkLikeBadges(userId: number): Promise<UserBadge[]> {
    const reviewRepository = getRepository(MediaReview);
    const likeRepository = getRepository(ReviewLike);
    const badges: UserBadge[] = [];

    // Get all reviews by user
    const userReviews = await reviewRepository.find({
      where: { userId },
      select: ['id'],
    });

    // No reviews = no likes possible
    if (userReviews.length === 0) {
      return badges;
    }

    const reviewIds = userReviews.map((r) => r.id);

    // Count total likes received on user's reviews (excluding self-likes)
    const likesCount = await likeRepository
      .createQueryBuilder('like')
      .where('like.reviewId IN (:...reviewIds)', { reviewIds })
      .andWhere('like.userId != :userId', { userId })
      .getCount();

    // No likes received, no badges to award
    if (likesCount === 0) {
      return badges;
    }

    logger.debug(
      `User ${userId} has ${likesCount} likes on ${userReviews.length} reviews`,
      {
        label: 'Badge Service',
      }
    );

    const milestones = [
      { count: 1, type: BadgeType.REVIEW_LIKES_RECEIVED_1 },
      { count: 50, type: BadgeType.REVIEW_LIKES_RECEIVED_50 },
      { count: 100, type: BadgeType.REVIEW_LIKES_RECEIVED_100 },
      { count: 500, type: BadgeType.REVIEW_LIKES_RECEIVED_500 },
    ];

    for (const milestone of milestones) {
      if (likesCount >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          count: likesCount,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check watching streak badges
   */
  private async checkStreakBadges(userId: number): Promise<UserBadge[]> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const badges: UserBadge[] = [];

    // Get all watch dates (distinct days)
    const watches = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('DATE(watch.watchedAt)', 'date')
      .where('watch.userId = :userId', { userId })
      .groupBy('DATE(watch.watchedAt)')
      .orderBy('DATE(watch.watchedAt)', 'DESC')
      .getRawMany();

    if (watches.length === 0) return badges;

    // Calculate current streak
    let currentStreak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWatchDate = new Date(watches[0].date);
    lastWatchDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - lastWatchDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Streak broken if more than 1 day gap
    if (daysDiff > 1) {
      return badges;
    }

    // Count consecutive days
    for (let i = 1; i < watches.length; i++) {
      const prevDate = new Date(watches[i - 1].date);
      const currDate = new Date(watches[i].date);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const diff = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    const milestones = [
      { count: 7, type: BadgeType.WATCHING_STREAK_7 },
      { count: 30, type: BadgeType.WATCHING_STREAK_30 },
      { count: 100, type: BadgeType.WATCHING_STREAK_100 },
    ];

    for (const milestone of milestones) {
      if (currentStreak >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          streak: currentStreak,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check special achievement badges
   */
  private async checkSpecialBadges(userId: number): Promise<UserBadge[]> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const badges: UserBadge[] = [];

    // Check Binge Watcher: watched full season in 24h (excluding manual entries)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentWatches = await watchHistoryRepository
      .createQueryBuilder('watch')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: MediaType.TV })
      .andWhere('watch.watchedAt >= :yesterday', { yesterday })
      .andWhere('watch.seasonNumber IS NOT NULL')
      .andWhere('watch.episodeNumber IS NOT NULL')
      .andWhere('watch.isManual = :isManual', { isManual: false })
      .groupBy('watch.mediaId')
      .addGroupBy('watch.seasonNumber')
      .select('watch.mediaId', 'mediaId')
      .addSelect('watch.seasonNumber', 'seasonNumber')
      .addSelect('COUNT(*)', 'episodeCount')
      .getRawMany();

    // Check if any season has 10+ episodes watched (approximate full season)
    if (recentWatches.some((w) => parseInt(w.episodeCount) >= 10)) {
      const badge = await this.awardBadge(userId, BadgeType.BINGE_WATCHER);
      if (badge) badges.push(badge);
    }

    // Check Rewatch King: rewatched 20 different items
    const rewatches = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('watch.mediaId', 'mediaId')
      .addSelect('watch.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'watchCount')
      .where('watch.userId = :userId', { userId })
      .groupBy('watch.mediaId')
      .addGroupBy('watch.mediaType')
      .having('COUNT(*) > 1')
      .getRawMany();

    if (rewatches.length >= 20) {
      const badge = await this.awardBadge(userId, BadgeType.REWATCH_KING, {
        count: rewatches.length,
      });
      if (badge) badges.push(badge);
    }

    // Note: COMPLETIONIST badge is now handled by checkSeriesCompletionBadges()
    // using the SeriesProgress entity for accurate series completion tracking

    return badges;
  }

  /**
   * Check series completion badges using SeriesProgress entity
   */
  private async checkSeriesCompletionBadges(
    userId: number
  ): Promise<UserBadge[]> {
    const seriesProgressRepository = getRepository(SeriesProgress);
    const badges: UserBadge[] = [];

    // Count completed series from SeriesProgress table
    const completedCount = await seriesProgressRepository.count({
      where: {
        userId,
        status: 'completed' as const,
      },
    });

    const milestones = [
      { count: 1, type: BadgeType.SERIES_COMPLETED_1 },
      { count: 5, type: BadgeType.SERIES_COMPLETED_5 },
      { count: 10, type: BadgeType.SERIES_COMPLETED_10 },
      { count: 25, type: BadgeType.SERIES_COMPLETED_25 },
      { count: 50, type: BadgeType.SERIES_COMPLETED_50 },
    ];

    for (const milestone of milestones) {
      if (completedCount >= milestone.count) {
        const badge = await this.awardBadge(userId, milestone.type, {
          count: completedCount,
        });
        if (badge) badges.push(badge);
      }
    }

    return badges;
  }

  /**
   * Check Early Adopter badge (first N users)
   */
  async checkEarlyAdopterBadge(userId: number): Promise<UserBadge | null> {
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) return null;

    // Award to first 10 users who track media
    const usersWithActivity = await userRepository
      .createQueryBuilder('user')
      .leftJoin('user.watchHistory', 'watch')
      .where('watch.id IS NOT NULL')
      .groupBy('user.id')
      .orderBy('user.createdAt', 'ASC')
      .limit(10)
      .getMany();

    if (usersWithActivity.some((u) => u.id === userId)) {
      return this.awardBadge(userId, BadgeType.EARLY_ADOPTER);
    }

    return null;
  }

  /**
   * Award community badge (admin-granted)
   */
  async awardCommunityBadge(
    userId: number,
    badgeType: string,
    awardedBy?: number
  ): Promise<UserBadge | null> {
    // Validate badge type is a community badge
    const validCommunityBadges = [
      BadgeType.COMMUNITY_HERO,
      BadgeType.TOP_REVIEWER_MONTH,
      BadgeType.TOP_REVIEWER_YEAR,
    ];

    if (!validCommunityBadges.includes(badgeType as BadgeType)) {
      return null;
    }

    const metadata = awardedBy ? { awardedBy } : undefined;
    return this.awardBadge(userId, badgeType as BadgeType, metadata);
  }

  /**
   * Get user's badges with definitions
   */
  async getUserBadges(userId: number) {
    const badgeRepository = getRepository(UserBadge);
    const badges = await badgeRepository.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });

    return badges.map((badge) => ({
      ...badge,
      ...BADGE_DEFINITIONS[badge.badgeType],
    }));
  }

  /**
   * Get badge progress for a user
   */
  async getBadgeProgress(userId: number) {
    const watchHistoryRepository = getRepository(WatchHistory);
    const reviewRepository = getRepository(MediaReview);
    const seriesProgressRepository = getRepository(SeriesProgress);

    // Count movies
    const movieCount = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('COUNT(DISTINCT watch.mediaId)', 'count')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: 'movie' })
      .getRawOne()
      .then((r) => parseInt(r?.count || '0'));

    // Count completed series (using SeriesProgress for consistency with badges)
    const seriesCount = await seriesProgressRepository.count({
      where: {
        userId,
        status: 'completed' as const,
      },
    });

    // Count episodes
    const episodeCount = await watchHistoryRepository.count({
      where: { userId, mediaType: MediaType.TV },
    });

    // Count reviews
    const reviewCount = await reviewRepository.count({
      where: { userId },
    });

    return {
      movies: movieCount,
      series: seriesCount,
      episodes: episodeCount,
      reviews: reviewCount,
    };
  }
}

export default new BadgeService();
