import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import type { SeriesProgressStatus } from '@server/entity/SeriesProgress';
import { SeriesProgress } from '@server/entity/SeriesProgress';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';

interface SeriesProgressResult {
  watchedEpisodes: number;
  totalEpisodes: number;
  totalSeasons: number;
  percentage: number;
  isCompleted: boolean;
  isOngoing: boolean;
}

interface SeriesProgressWithDetails extends SeriesProgress {
  title?: string;
  posterPath?: string;
  backdropPath?: string;
}

class SeriesProgressService {
  private getTmdb(): TheMovieDb {
    return new TheMovieDb();
  }

  /**
   * Update series progress when an episode is watched
   */
  async updateProgress(
    userId: number,
    mediaId: number,
    tmdbId: number
  ): Promise<SeriesProgress> {
    const progressRepository = getRepository(SeriesProgress);
    const watchHistoryRepository = getRepository(WatchHistory);

    // Get or create progress entry
    let progress = await progressRepository.findOne({
      where: { userId, mediaId },
    });

    // Fetch TMDB data for total episodes
    let tmdbData: {
      totalEpisodes: number;
      totalSeasons: number;
      isOngoing: boolean;
    };
    try {
      const tvShow = await this.getTmdb().getTvShow({ tvId: tmdbId });
      tmdbData = {
        totalEpisodes: tvShow.number_of_episodes,
        totalSeasons: tvShow.number_of_seasons,
        isOngoing: tvShow.in_production || tvShow.status === 'Returning Series',
      };
    } catch (error) {
      logger.warn(`Failed to fetch TMDB data for series ${tmdbId}`, {
        label: 'SeriesProgress',
        error: (error as Error).message,
      });
      // Use cached data if available, otherwise set defaults
      tmdbData = {
        totalEpisodes: progress?.totalEpisodes || 0,
        totalSeasons: progress?.totalSeasons || 0,
        isOngoing: progress?.isOngoing || false,
      };
    }

    // Count unique episodes watched by this user for this series
    const watchedEpisodesResult = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select(
        'COUNT(DISTINCT CONCAT(watch.seasonNumber, "-", watch.episodeNumber))',
        'count'
      )
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaId = :mediaId', { mediaId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: MediaType.TV })
      .andWhere('watch.seasonNumber IS NOT NULL')
      .andWhere('watch.episodeNumber IS NOT NULL')
      .andWhere('watch.seasonNumber > 0') // Exclude specials (season 0)
      .getRawOne();

    const watchedEpisodes = parseInt(watchedEpisodesResult?.count || '0');

    // Calculate completion percentage
    const percentage =
      tmdbData.totalEpisodes > 0
        ? Math.round((watchedEpisodes / tmdbData.totalEpisodes) * 10000) / 100
        : 0;

    // Determine status
    let status: SeriesProgressStatus = 'not_started';
    let completedAt: Date | null = null;
    let shouldIncrementCompletionCount = false;

    const isNowCompleted =
      watchedEpisodes >= tmdbData.totalEpisodes &&
      tmdbData.totalEpisodes > 0 &&
      !tmdbData.isOngoing;

    if (watchedEpisodes === 0) {
      status = 'not_started';
    } else if (isNowCompleted) {
      status = 'completed';
      completedAt = new Date();
      // Increment completion count only if transitioning to completed for the first time
      // or if we're completing again after more episodes were added
      if (progress?.status !== 'completed') {
        shouldIncrementCompletionCount = true;
      }
    } else if (watchedEpisodes > 0) {
      status = 'in_progress';
    }

    // Keep existing completedAt if already completed
    if (progress?.status === 'completed' && progress.completedAt) {
      completedAt = progress.completedAt;
    }

    // Keep abandoned status if manually set
    if (progress?.status === 'abandoned') {
      status = 'abandoned';
    }

    if (progress) {
      // Update existing progress
      progress.totalEpisodes = tmdbData.totalEpisodes;
      progress.totalSeasons = tmdbData.totalSeasons;
      progress.watchedEpisodes = watchedEpisodes;
      progress.completionPercentage = percentage;
      progress.status = status;
      progress.isOngoing = tmdbData.isOngoing;
      progress.lastWatchedAt = new Date();
      if (completedAt && !progress.completedAt) {
        progress.completedAt = completedAt;
      }
      if (shouldIncrementCompletionCount) {
        progress.completionCount = (progress.completionCount || 0) + 1;
      }
    } else {
      // Create new progress
      progress = new SeriesProgress({
        userId,
        mediaId,
        tmdbId,
        totalEpisodes: tmdbData.totalEpisodes,
        totalSeasons: tmdbData.totalSeasons,
        watchedEpisodes,
        completionPercentage: percentage,
        status,
        isOngoing: tmdbData.isOngoing,
        completedAt,
        lastWatchedAt: new Date(),
        completionCount: shouldIncrementCompletionCount ? 1 : 0,
      });
    }

    await progressRepository.save(progress);

    logger.debug(
      `Updated series progress for user ${userId}, series ${tmdbId}: ${watchedEpisodes}/${tmdbData.totalEpisodes} (${percentage}%)`,
      { label: 'SeriesProgress' }
    );

    return progress;
  }

  /**
   * Calculate progress for a series without updating
   */
  async calculateProgress(
    userId: number,
    mediaId: number,
    tmdbId: number
  ): Promise<SeriesProgressResult> {
    const watchHistoryRepository = getRepository(WatchHistory);

    // Get TMDB data
    let totalEpisodes = 0;
    let totalSeasons = 0;
    let isOngoing = false;

    try {
      const tvShow = await this.getTmdb().getTvShow({ tvId: tmdbId });
      totalEpisodes = tvShow.number_of_episodes;
      totalSeasons = tvShow.number_of_seasons;
      isOngoing = tvShow.in_production || tvShow.status === 'Returning Series';
    } catch (error) {
      logger.warn(`Failed to fetch TMDB data for series ${tmdbId}`, {
        label: 'SeriesProgress',
        error: (error as Error).message,
      });
    }

    // Count watched episodes
    const watchedEpisodesResult = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select(
        'COUNT(DISTINCT CONCAT(watch.seasonNumber, "-", watch.episodeNumber))',
        'count'
      )
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaId = :mediaId', { mediaId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: MediaType.TV })
      .andWhere('watch.seasonNumber IS NOT NULL')
      .andWhere('watch.episodeNumber IS NOT NULL')
      .andWhere('watch.seasonNumber > 0')
      .getRawOne();

    const watchedEpisodes = parseInt(watchedEpisodesResult?.count || '0');
    const percentage =
      totalEpisodes > 0
        ? Math.round((watchedEpisodes / totalEpisodes) * 10000) / 100
        : 0;

    return {
      watchedEpisodes,
      totalEpisodes,
      totalSeasons,
      percentage,
      isCompleted:
        watchedEpisodes >= totalEpisodes && totalEpisodes > 0 && !isOngoing,
      isOngoing,
    };
  }

  /**
   * Get series progress for a user
   */
  async getSeriesProgress(
    userId: number,
    mediaId: number
  ): Promise<SeriesProgress | null> {
    const progressRepository = getRepository(SeriesProgress);
    return progressRepository.findOne({
      where: { userId, mediaId },
    });
  }

  /**
   * Get all series progress for a user
   */
  async getUserSeriesProgress(
    userId: number,
    options: {
      status?: 'all' | 'in_progress' | 'completed' | 'abandoned';
      sortBy?: 'lastWatched' | 'percentage' | 'name';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ results: SeriesProgressWithDetails[]; totalCount: number }> {
    const progressRepository = getRepository(SeriesProgress);

    const queryBuilder = progressRepository
      .createQueryBuilder('progress')
      .where('progress.userId = :userId', { userId });

    // Filter by status
    if (options.status && options.status !== 'all') {
      queryBuilder.andWhere('progress.status = :status', {
        status: options.status,
      });
    }

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Sort
    switch (options.sortBy) {
      case 'percentage':
        queryBuilder.orderBy('progress.completionPercentage', 'DESC');
        break;
      case 'name':
        // Will be sorted after fetching media titles
        queryBuilder.orderBy('progress.lastWatchedAt', 'DESC');
        break;
      case 'lastWatched':
      default:
        queryBuilder.orderBy('progress.lastWatchedAt', 'DESC');
    }

    // Pagination
    if (options.limit) {
      queryBuilder.take(options.limit);
    }
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    const progressList = await queryBuilder.getMany();

    // Enrich with TMDB details
    const tmdb = this.getTmdb();
    const results: SeriesProgressWithDetails[] = await Promise.all(
      progressList.map(async (progress) => {
        try {
          const tvShow = await tmdb.getTvShow({ tvId: progress.tmdbId });
          return {
            ...progress,
            title: tvShow.name,
            posterPath: tvShow.poster_path || undefined,
            backdropPath: tvShow.backdrop_path || undefined,
          };
        } catch {
          return {
            ...progress,
            title: undefined,
            posterPath: undefined,
            backdropPath: undefined,
          };
        }
      })
    );

    return { results, totalCount };
  }

  /**
   * Mark a series as abandoned
   */
  async markAsAbandoned(
    userId: number,
    mediaId: number
  ): Promise<SeriesProgress | null> {
    const progressRepository = getRepository(SeriesProgress);

    const progress = await progressRepository.findOne({
      where: { userId, mediaId },
    });

    if (!progress) {
      return null;
    }

    progress.status = 'abandoned';
    await progressRepository.save(progress);

    logger.info(`User ${userId} marked series ${mediaId} as abandoned`, {
      label: 'SeriesProgress',
    });

    return progress;
  }

  /**
   * Resume a series (change from abandoned to in_progress)
   */
  async resumeSeries(
    userId: number,
    mediaId: number
  ): Promise<SeriesProgress | null> {
    const progressRepository = getRepository(SeriesProgress);

    const progress = await progressRepository.findOne({
      where: { userId, mediaId },
    });

    if (!progress || progress.status !== 'abandoned') {
      return null;
    }

    progress.status =
      progress.watchedEpisodes > 0 ? 'in_progress' : 'not_started';
    await progressRepository.save(progress);

    logger.info(`User ${userId} resumed series ${mediaId}`, {
      label: 'SeriesProgress',
    });

    return progress;
  }

  /**
   * Get series completion stats for a user
   */
  async getUserSeriesStats(userId: number): Promise<{
    totalStarted: number;
    totalCompleted: number;
    totalAbandoned: number;
    totalInProgress: number;
    averageCompletion: number;
    totalEpisodesWatched: number;
  }> {
    const progressRepository = getRepository(SeriesProgress);
    const watchHistoryRepository = getRepository(WatchHistory);

    // Count by status
    const stats = await progressRepository
      .createQueryBuilder('progress')
      .select('progress.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('progress.userId = :userId', { userId })
      .groupBy('progress.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    stats.forEach((s) => {
      statusCounts[s.status] = parseInt(s.count);
    });

    // Calculate average completion
    const avgResult = await progressRepository
      .createQueryBuilder('progress')
      .select('AVG(progress.completionPercentage)', 'avg')
      .where('progress.userId = :userId', { userId })
      .andWhere('progress.status != :status', { status: 'not_started' })
      .getRawOne();

    const averageCompletion = parseFloat(avgResult?.avg || '0');

    // Total episodes watched (unique)
    const episodesResult = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select(
        'COUNT(DISTINCT CONCAT(watch.mediaId, "-", watch.seasonNumber, "-", watch.episodeNumber))',
        'count'
      )
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: MediaType.TV })
      .andWhere('watch.seasonNumber IS NOT NULL')
      .andWhere('watch.episodeNumber IS NOT NULL')
      .getRawOne();

    const totalEpisodesWatched = parseInt(episodesResult?.count || '0');

    return {
      totalStarted:
        (statusCounts['in_progress'] || 0) +
        (statusCounts['completed'] || 0) +
        (statusCounts['abandoned'] || 0),
      totalCompleted: statusCounts['completed'] || 0,
      totalAbandoned: statusCounts['abandoned'] || 0,
      totalInProgress: statusCounts['in_progress'] || 0,
      averageCompletion: Math.round(averageCompletion * 100) / 100,
      totalEpisodesWatched,
    };
  }

  /**
   * Get count of completed series for a user (for badges)
   */
  async getCompletedSeriesCount(userId: number): Promise<number> {
    const progressRepository = getRepository(SeriesProgress);

    return progressRepository.count({
      where: {
        userId,
        status: 'completed' as SeriesProgressStatus,
      },
    });
  }

  /**
   * Recalculate all series progress for a user
   * Useful after TMDB data updates or data migration
   */
  async recalculateAllProgress(userId: number): Promise<void> {
    const watchHistoryRepository = getRepository(WatchHistory);

    // Get all unique TV series the user has watched
    const series = await watchHistoryRepository
      .createQueryBuilder('watch')
      .select('DISTINCT watch.mediaId', 'mediaId')
      .addSelect('media.tmdbId', 'tmdbId')
      .innerJoin('watch.media', 'media')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaType = :mediaType', { mediaType: MediaType.TV })
      .getRawMany();

    logger.info(
      `Recalculating progress for ${series.length} series for user ${userId}`,
      {
        label: 'SeriesProgress',
      }
    );

    for (const s of series) {
      try {
        await this.updateProgress(userId, s.mediaId, s.tmdbId);
      } catch (error) {
        logger.error(`Failed to recalculate progress for series ${s.mediaId}`, {
          label: 'SeriesProgress',
          error: (error as Error).message,
        });
      }
    }

    logger.info(`Completed recalculating progress for user ${userId}`, {
      label: 'SeriesProgress',
    });
  }
}

export default new SeriesProgressService();
