import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { WatchHistory } from '@server/entity/WatchHistory';
import logger from '@server/logger';
import seriesProgressService from './seriesProgressService';

interface MarkSeasonResult {
  markedEpisodes: number;
  skippedEpisodes: number;
  totalEpisodes: number;
}

class WatchHistoryService {
  private getTmdb(): TheMovieDb {
    return new TheMovieDb();
  }

  /**
   * Mark an entire season as watched
   * Creates watch_history entries with isManual = true for episodes not already watched
   * Does NOT trigger badges (manual entries should not count towards badges)
   */
  async markSeasonAsWatched(
    userId: number,
    tmdbId: number,
    seasonNumber: number,
    watchedAt?: Date
  ): Promise<MarkSeasonResult> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    // Get or create the media entry
    let media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      // Create a minimal media entry
      media = new Media({
        tmdbId,
        mediaType: MediaType.TV,
      });
      await mediaRepository.save(media);
    }

    // Fetch season details from TMDB to get episode list
    const tmdb = this.getTmdb();
    let episodes: { episodeNumber: number; airDate?: string }[] = [];

    try {
      const seasonDetails = await tmdb.getTvSeason({
        tvId: tmdbId,
        seasonNumber,
      });

      episodes = seasonDetails.episodes.map((ep) => ({
        episodeNumber: ep.episode_number,
        airDate: ep.air_date || undefined,
      }));
    } catch (error) {
      logger.error(`Failed to fetch season ${seasonNumber} for series ${tmdbId}`, {
        label: 'WatchHistoryService',
        error: (error as Error).message,
      });
      throw new Error(`Failed to fetch season data from TMDB`);
    }

    if (episodes.length === 0) {
      return {
        markedEpisodes: 0,
        skippedEpisodes: 0,
        totalEpisodes: 0,
      };
    }

    // Get existing watch entries for this season
    const existingEntries = await watchHistoryRepository
      .createQueryBuilder('watch')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaId = :mediaId', { mediaId: media.id })
      .andWhere('watch.seasonNumber = :seasonNumber', { seasonNumber })
      .getMany();

    const existingEpisodes = new Set(
      existingEntries.map((e) => e.episodeNumber)
    );

    const watchDate = watchedAt || new Date();
    let markedEpisodes = 0;
    let skippedEpisodes = 0;

    // Create entries for episodes not already watched
    for (const episode of episodes) {
      if (existingEpisodes.has(episode.episodeNumber)) {
        skippedEpisodes++;
        continue;
      }

      const watchEntry = new WatchHistory({
        userId,
        mediaId: media.id,
        mediaType: MediaType.TV,
        seasonNumber,
        episodeNumber: episode.episodeNumber,
        watchedAt: watchDate,
        isManual: true, // Mark as manual entry
      });

      await watchHistoryRepository.save(watchEntry);
      markedEpisodes++;
    }

    // Update series progress (this will recalculate based on all entries)
    if (markedEpisodes > 0) {
      await seriesProgressService.updateProgress(userId, media.id, tmdbId);
    }

    logger.info(
      `User ${userId} marked season ${seasonNumber} of series ${tmdbId} as watched: ${markedEpisodes} new, ${skippedEpisodes} skipped`,
      { label: 'WatchHistoryService' }
    );

    return {
      markedEpisodes,
      skippedEpisodes,
      totalEpisodes: episodes.length,
    };
  }

  /**
   * Unmark a season as watched (remove manual entries only)
   * Only removes entries with isManual = true
   */
  async unmarkSeasonAsWatched(
    userId: number,
    tmdbId: number,
    seasonNumber: number
  ): Promise<number> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    const media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      return 0;
    }

    // Delete only manual entries for this season
    const result = await watchHistoryRepository
      .createQueryBuilder()
      .delete()
      .from(WatchHistory)
      .where('userId = :userId', { userId })
      .andWhere('mediaId = :mediaId', { mediaId: media.id })
      .andWhere('seasonNumber = :seasonNumber', { seasonNumber })
      .andWhere('isManual = :isManual', { isManual: true })
      .execute();

    const deletedCount = result.affected || 0;

    // Update series progress
    if (deletedCount > 0) {
      await seriesProgressService.updateProgress(userId, media.id, tmdbId);
    }

    logger.info(
      `User ${userId} unmarked season ${seasonNumber} of series ${tmdbId}: ${deletedCount} entries removed`,
      { label: 'WatchHistoryService' }
    );

    return deletedCount;
  }

  /**
   * Check if a season has any manual entries for a user
   */
  async hasManualEntries(
    userId: number,
    tmdbId: number,
    seasonNumber: number
  ): Promise<boolean> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    const media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      return false;
    }

    const count = await watchHistoryRepository
      .createQueryBuilder('watch')
      .where('watch.userId = :userId', { userId })
      .andWhere('watch.mediaId = :mediaId', { mediaId: media.id })
      .andWhere('watch.seasonNumber = :seasonNumber', { seasonNumber })
      .andWhere('watch.isManual = :isManual', { isManual: true })
      .getCount();

    return count > 0;
  }

  /**
   * Get season watch status for a user
   */
  async getSeasonWatchStatus(
    userId: number,
    tmdbId: number,
    seasonNumber: number
  ): Promise<{
    watchedEpisodes: number;
    manualEpisodes: number;
    totalEpisodes: number;
    watchedEpisodeNumbers: number[];
    manualEpisodeNumbers: number[];
  } | null> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    // Get TMDB episode count first (this always works even without local media)
    const tmdb = this.getTmdb();
    let totalEpisodes = 0;

    try {
      const seasonDetails = await tmdb.getTvSeason({
        tvId: tmdbId,
        seasonNumber,
      });
      totalEpisodes = seasonDetails.episodes.length;
    } catch (error) {
      logger.warn(`Failed to fetch season ${seasonNumber} for TMDB ${tmdbId}`, {
        label: 'WatchHistoryService',
        error: (error as Error).message,
      });
      // Return empty status if TMDB fails
      return {
        watchedEpisodes: 0,
        manualEpisodes: 0,
        totalEpisodes: 0,
        watchedEpisodeNumbers: [],
        manualEpisodeNumbers: [],
      };
    }

    const media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    // If no local media entry, user hasn't watched anything yet
    if (!media) {
      return {
        watchedEpisodes: 0,
        manualEpisodes: 0,
        totalEpisodes,
        watchedEpisodeNumbers: [],
        manualEpisodeNumbers: [],
      };
    }

    // Get all watched episodes for this season
    const watchedEntries = await watchHistoryRepository.find({
      where: {
        userId,
        mediaId: media.id,
        seasonNumber,
      },
      select: ['episodeNumber', 'isManual'],
    });

    const watchedEpisodeNumbers: number[] = [];
    const manualEpisodeNumbers: number[] = [];

    for (const entry of watchedEntries) {
      const epNum = entry.episodeNumber;
      if (epNum !== null && epNum !== undefined && !watchedEpisodeNumbers.includes(epNum)) {
        watchedEpisodeNumbers.push(epNum);
      }
      if (entry.isManual && epNum !== null && epNum !== undefined && !manualEpisodeNumbers.includes(epNum)) {
        manualEpisodeNumbers.push(epNum);
      }
    }

    return {
      watchedEpisodes: watchedEpisodeNumbers.length,
      manualEpisodes: manualEpisodeNumbers.length,
      totalEpisodes,
      watchedEpisodeNumbers: watchedEpisodeNumbers.sort((a, b) => a - b),
      manualEpisodeNumbers: manualEpisodeNumbers.sort((a, b) => a - b),
    };
  }

  /**
   * Mark a single episode as watched
   */
  async markEpisodeAsWatched(
    userId: number,
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number,
    watchedAt?: Date
  ): Promise<{ marked: boolean; alreadyWatched: boolean }> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    // Get or create the media entry
    let media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      media = new Media({
        tmdbId,
        mediaType: MediaType.TV,
      });
      await mediaRepository.save(media);
    }

    // Check if already watched
    const existing = await watchHistoryRepository.findOne({
      where: {
        userId,
        mediaId: media.id,
        seasonNumber,
        episodeNumber,
      },
    });

    if (existing) {
      return { marked: false, alreadyWatched: true };
    }

    const watchEntry = new WatchHistory({
      userId,
      mediaId: media.id,
      mediaType: MediaType.TV,
      seasonNumber,
      episodeNumber,
      watchedAt: watchedAt || new Date(),
      isManual: true,
    });

    await watchHistoryRepository.save(watchEntry);

    // Update series progress
    await seriesProgressService.updateProgress(userId, media.id, tmdbId);

    logger.info(
      `User ${userId} marked S${seasonNumber}E${episodeNumber} of series ${tmdbId} as watched`,
      { label: 'WatchHistoryService' }
    );

    return { marked: true, alreadyWatched: false };
  }

  /**
   * Mark multiple episodes as watched
   */
  async markEpisodesAsWatched(
    userId: number,
    tmdbId: number,
    episodes: { seasonNumber: number; episodeNumber: number }[],
    watchedAt?: Date
  ): Promise<{ markedEpisodes: number; skippedEpisodes: number }> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    // Get or create the media entry
    let media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      media = new Media({
        tmdbId,
        mediaType: MediaType.TV,
      });
      await mediaRepository.save(media);
    }

    const watchDate = watchedAt || new Date();
    let markedEpisodes = 0;
    let skippedEpisodes = 0;

    for (const ep of episodes) {
      // Check if already watched
      const existing = await watchHistoryRepository.findOne({
        where: {
          userId,
          mediaId: media.id,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
        },
      });

      if (existing) {
        skippedEpisodes++;
        continue;
      }

      const watchEntry = new WatchHistory({
        userId,
        mediaId: media.id,
        mediaType: MediaType.TV,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        watchedAt: watchDate,
        isManual: true,
      });

      await watchHistoryRepository.save(watchEntry);
      markedEpisodes++;
    }

    // Update series progress
    if (markedEpisodes > 0) {
      await seriesProgressService.updateProgress(userId, media.id, tmdbId);
    }

    logger.info(
      `User ${userId} marked ${markedEpisodes} episodes of series ${tmdbId} as watched (${skippedEpisodes} skipped)`,
      { label: 'WatchHistoryService' }
    );

    return { markedEpisodes, skippedEpisodes };
  }

  /**
   * Unmark a single episode (remove manual entry only)
   */
  async unmarkEpisodeAsWatched(
    userId: number,
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<boolean> {
    const watchHistoryRepository = getRepository(WatchHistory);
    const mediaRepository = getRepository(Media);

    const media = await mediaRepository.findOne({
      where: { tmdbId, mediaType: MediaType.TV },
    });

    if (!media) {
      return false;
    }

    const result = await watchHistoryRepository
      .createQueryBuilder()
      .delete()
      .from(WatchHistory)
      .where('userId = :userId', { userId })
      .andWhere('mediaId = :mediaId', { mediaId: media.id })
      .andWhere('seasonNumber = :seasonNumber', { seasonNumber })
      .andWhere('episodeNumber = :episodeNumber', { episodeNumber })
      .andWhere('isManual = :isManual', { isManual: true })
      .execute();

    const deleted = (result.affected || 0) > 0;

    if (deleted) {
      await seriesProgressService.updateProgress(userId, media.id, tmdbId);
      logger.info(
        `User ${userId} unmarked S${seasonNumber}E${episodeNumber} of series ${tmdbId}`,
        { label: 'WatchHistoryService' }
      );
    }

    return deleted;
  }
}

export default new WatchHistoryService();
