import JellyfinAPI, { type JellyfinSession } from '@server/api/jellyfin';
import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import { DailyActivity } from '@server/entity/DailyActivity';
import Media from '@server/entity/Media';
import { User } from '@server/entity/User';
import { WatchHistory } from '@server/entity/WatchHistory';
import badgeService from '@server/lib/badgeService';
import seriesProgressService from '@server/lib/seriesProgressService';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Between, IsNull } from 'typeorm';

// Cache for Jellyfin Series ID -> TMDB ID lookups (persists across polls)
const seriesToTmdbCache: Map<string, number | null> = new Map();

// Default configuration
const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds

// Helper to get tracking settings
const getTrackingSettings = () => {
  const settings = getSettings();
  return (
    settings.tracking?.jellyfinAutoSync ?? {
      completionThreshold: 85,
      minWatchSeconds: 120,
      minActivitySeconds: 60,
    }
  );
};

interface ActiveSession {
  sessionId: string;
  seerrUserId: number;
  jellyfinUserId: string;
  jellyfinItemId: string;
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  startedAt: Date;
  lastSeenAt: Date;
  positionTicks: number;
  runtimeTicks: number;
  isPaused: boolean;
  mediaTitle: string;
}

interface UserSyncSettings {
  enabled: boolean;
  completionThreshold: number;
  minWatchSeconds: number;
}

class JellyfinActivityMonitor {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private userSyncSettings: Map<number, UserSyncSettings> = new Map();

  // Cache of Jellyfin user ID -> Seerr user mapping
  private userMappingCache: Map<string, User | null> = new Map();
  private userMappingCacheExpiry: Date = new Date(0);
  private readonly USER_CACHE_TTL = 60000; // 1 minute

  /**
   * Start the activity monitor
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Jellyfin Activity Monitor is already running', {
        label: 'Jellyfin Activity Monitor',
      });
      return;
    }

    const settings = getSettings();
    if (!settings.jellyfin?.apiKey) {
      logger.info('Jellyfin not configured, Activity Monitor will not start', {
        label: 'Jellyfin Activity Monitor',
      });
      return;
    }

    logger.info('Starting Jellyfin Activity Monitor', {
      label: 'Jellyfin Activity Monitor',
      pollInterval: DEFAULT_POLL_INTERVAL,
    });

    this.isRunning = true;
    await this.refreshUserMappingCache();
    await this.loadUserSyncSettings();

    // Start polling
    this.pollingInterval = setInterval(() => {
      this.pollSessions().catch((error) => {
        logger.error('Error polling Jellyfin sessions', {
          label: 'Jellyfin Activity Monitor',
          error: error.message,
        });
      });
    }, DEFAULT_POLL_INTERVAL);

    // Run initial poll immediately
    await this.pollSessions();
  }

  /**
   * Stop the activity monitor
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Jellyfin Activity Monitor', {
      label: 'Jellyfin Activity Monitor',
    });

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Process any remaining active sessions as stopped
    for (const session of this.activeSessions.values()) {
      this.processSessionEnd(session).catch((error) => {
        logger.error('Error processing session end on stop', {
          label: 'Jellyfin Activity Monitor',
          error: error.message,
        });
      });
    }

    this.activeSessions.clear();
    this.isRunning = false;
  }

  /**
   * Check if monitor is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current active sessions count
   */
  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Refresh user sync settings from database
   */
  public async loadUserSyncSettings(): Promise<void> {
    try {
      const userRepository = getRepository(User);

      // Get all users with Jellyfin linked and auto-sync enabled
      const linkedUsers = await userRepository
        .createQueryBuilder('user')
        .where('user.jellyfinUserId IS NOT NULL')
        .andWhere('user.jellyfinAutoSyncEnabled = :enabled', { enabled: true })
        .getMany();

      this.userSyncSettings.clear();
      const trackingSettings = getTrackingSettings();
      for (const user of linkedUsers) {
        this.userSyncSettings.set(user.id, {
          enabled: user.jellyfinAutoSyncEnabled,
          // Use global settings from admin configuration
          completionThreshold: trackingSettings.completionThreshold,
          minWatchSeconds: trackingSettings.minWatchSeconds,
        });
      }

      logger.debug(
        `Loaded sync settings for ${this.userSyncSettings.size} users`,
        {
          label: 'Jellyfin Activity Monitor',
        }
      );
    } catch (error) {
      logger.error('Failed to load user sync settings', {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Refresh the cache of Jellyfin -> Seerr user mappings
   */
  private async refreshUserMappingCache(): Promise<void> {
    if (new Date() < this.userMappingCacheExpiry) {
      return;
    }

    try {
      const userRepository = getRepository(User);
      const users = await userRepository
        .createQueryBuilder('user')
        .where('user.jellyfinUserId IS NOT NULL')
        .getMany();

      this.userMappingCache.clear();
      for (const user of users) {
        if (user.jellyfinUserId) {
          this.userMappingCache.set(user.jellyfinUserId, user);
        }
      }

      this.userMappingCacheExpiry = new Date(Date.now() + this.USER_CACHE_TTL);

      logger.debug(`Refreshed user mapping cache: ${users.length} users`, {
        label: 'Jellyfin Activity Monitor',
      });
    } catch (error) {
      logger.error('Failed to refresh user mapping cache', {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get Seerr user from Jellyfin user ID
   */
  private async getSeerrUser(jellyfinUserId: string): Promise<User | null> {
    await this.refreshUserMappingCache();
    return this.userMappingCache.get(jellyfinUserId) || null;
  }

  /**
   * Poll Jellyfin for active sessions
   */
  private async pollSessions(): Promise<void> {
    const settings = getSettings();
    const hostname = this.getJellyfinHostname();

    if (!hostname || !settings.jellyfin?.apiKey) {
      return;
    }

    try {
      const jellyfinApi = new JellyfinAPI(hostname, settings.jellyfin.apiKey);
      const sessions = await jellyfinApi.getSessions();

      // Track which sessions we've seen this poll
      const seenSessionIds = new Set<string>();

      for (const session of sessions) {
        seenSessionIds.add(session.Id);
        await this.processSession(session);
      }

      // Find sessions that are no longer active
      for (const [sessionId, activeSession] of this.activeSessions) {
        if (!seenSessionIds.has(sessionId)) {
          await this.processSessionEnd(activeSession);
          this.activeSessions.delete(sessionId);
        }
      }
    } catch (error) {
      logger.error('Failed to poll Jellyfin sessions', {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Process a session from Jellyfin
   */
  private async processSession(session: JellyfinSession): Promise<void> {
    if (!session.NowPlayingItem || !session.PlayState) {
      return;
    }

    // Get Seerr user for this Jellyfin user
    const seerrUser = await this.getSeerrUser(session.UserId);
    if (!seerrUser) {
      // User not linked to Seerr - skip
      return;
    }

    // Check if user has auto-sync enabled
    const userSettings = this.userSyncSettings.get(seerrUser.id);
    if (!userSettings?.enabled) {
      return;
    }

    const existingSession = this.activeSessions.get(session.Id);
    const nowPlayingItem = session.NowPlayingItem;

    // Determine media type
    const mediaType =
      nowPlayingItem.Type === 'Movie' ? MediaType.MOVIE : MediaType.TV;

    // Get TMDB ID - try direct TMDB first, then fallback to TVDB lookup
    let tmdbId = parseInt(nowPlayingItem.ProviderIds?.Tmdb || '0', 10);

    if (!tmdbId && mediaType === MediaType.TV) {
      // For TV shows/episodes, try to get TMDB ID from TVDB
      // First try the episode's TVDB ID, but that usually fails
      // So we fetch the series' TVDB ID from the parent series
      const seriesId = nowPlayingItem.SeriesId;

      if (seriesId) {
        tmdbId = await this.getTmdbIdFromSeriesId(
          seriesId,
          nowPlayingItem.SeriesName || nowPlayingItem.Name
        );
      }
    }

    if (!tmdbId) {
      // No TMDB ID found - can't track this
      logger.debug(
        `Skipping session - no TMDB ID for ${nowPlayingItem.Name} (TVDB: ${
          nowPlayingItem.ProviderIds?.Tvdb || 'none'
        })`,
        {
          label: 'Jellyfin Activity Monitor',
        }
      );
      return;
    }

    if (existingSession) {
      // Check if the item changed (user switched to different content)
      // IMPORTANT: Do this BEFORE updating position to preserve the old position for accurate tracking
      if (existingSession.jellyfinItemId !== nowPlayingItem.Id) {
        // End the old session with its preserved position (from previous poll)
        await this.processSessionEnd(existingSession);
        // Start a new session for the new content
        await this.startNewSession(session, seerrUser, tmdbId, mediaType);
      } else {
        // Same item - update session state
        existingSession.lastSeenAt = new Date();
        existingSession.positionTicks = session.PlayState.PositionTicks;
        existingSession.isPaused = session.PlayState.IsPaused;
      }
    } else {
      // New session
      await this.startNewSession(session, seerrUser, tmdbId, mediaType);
    }
  }

  /**
   * Get TMDB ID from Jellyfin Series ID by fetching series info and looking up TVDB
   */
  private async getTmdbIdFromSeriesId(
    jellyfinSeriesId: string,
    title: string
  ): Promise<number> {
    // Check cache first (we cache by Jellyfin series ID)
    if (seriesToTmdbCache.has(jellyfinSeriesId)) {
      const cached = seriesToTmdbCache.get(jellyfinSeriesId);
      return cached || 0;
    }

    try {
      const settings = getSettings();
      const hostname = this.getJellyfinHostname();

      if (!hostname || !settings.jellyfin?.apiKey) {
        return 0;
      }

      // Fetch the series info from Jellyfin to get its TVDB ID
      const jellyfinApi = new JellyfinAPI(hostname, settings.jellyfin.apiKey);
      const seriesInfo = await jellyfinApi.getItemData(jellyfinSeriesId);

      if (!seriesInfo) {
        logger.debug(`Could not fetch series info for ${jellyfinSeriesId}`, {
          label: 'Jellyfin Activity Monitor',
        });
        return 0;
      }

      // First check if series has TMDB ID directly
      const tmdbIdDirect = parseInt(seriesInfo.ProviderIds?.Tmdb || '0', 10);
      if (tmdbIdDirect) {
        seriesToTmdbCache.set(jellyfinSeriesId, tmdbIdDirect);
        logger.debug(
          `Found TMDB ID ${tmdbIdDirect} directly on series "${title}"`,
          {
            label: 'Jellyfin Activity Monitor',
          }
        );
        return tmdbIdDirect;
      }

      // Otherwise, try TVDB lookup
      const tvdbId = parseInt(seriesInfo.ProviderIds?.Tvdb || '0', 10);
      if (!tvdbId) {
        seriesToTmdbCache.set(jellyfinSeriesId, null);
        logger.debug(`No TVDB ID found for series "${title}"`, {
          label: 'Jellyfin Activity Monitor',
        });
        return 0;
      }

      // Lookup TMDB ID from TVDB
      const tmdb = new TheMovieDb();
      const result = await tmdb.getByExternalId({
        externalId: tvdbId,
        type: 'tvdb',
      });

      if (result.tv_results && result.tv_results.length > 0) {
        const tmdbId = result.tv_results[0].id;
        seriesToTmdbCache.set(jellyfinSeriesId, tmdbId);

        logger.debug(
          `Resolved series "${title}" TVDB ${tvdbId} -> TMDB ${tmdbId}`,
          {
            label: 'Jellyfin Activity Monitor',
          }
        );

        return tmdbId;
      }

      // No result found - cache the failure
      seriesToTmdbCache.set(jellyfinSeriesId, null);
      logger.debug(
        `No TMDB match found for series "${title}" (TVDB: ${tvdbId})`,
        {
          label: 'Jellyfin Activity Monitor',
        }
      );

      return 0;
    } catch (error) {
      logger.error(`Failed to lookup TMDB ID for series "${title}"`, {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
      });

      return 0;
    }
  }

  /**
   * Start tracking a new session
   */
  private async startNewSession(
    session: JellyfinSession,
    seerrUser: User,
    tmdbId: number,
    mediaType: MediaType
  ): Promise<void> {
    const nowPlayingItem = session.NowPlayingItem!;
    const playState = session.PlayState!;

    const activeSession: ActiveSession = {
      sessionId: session.Id,
      seerrUserId: seerrUser.id,
      jellyfinUserId: session.UserId,
      jellyfinItemId: nowPlayingItem.Id,
      tmdbId,
      mediaType,
      seasonNumber: nowPlayingItem.ParentIndexNumber,
      episodeNumber: nowPlayingItem.IndexNumber,
      startedAt: new Date(),
      lastSeenAt: new Date(),
      positionTicks: playState.PositionTicks,
      runtimeTicks: nowPlayingItem.RunTimeTicks,
      isPaused: playState.IsPaused,
      mediaTitle: nowPlayingItem.Name,
    };

    this.activeSessions.set(session.Id, activeSession);

    logger.debug(
      `Started tracking session for ${seerrUser.displayName}: ${nowPlayingItem.Name}`,
      {
        label: 'Jellyfin Activity Monitor',
        sessionId: session.Id,
        tmdbId,
        mediaType,
      }
    );
  }

  /**
   * Process the end of a session
   */
  private async processSessionEnd(session: ActiveSession): Promise<void> {
    const userSettings = this.userSyncSettings.get(session.seerrUserId);
    if (!userSettings) {
      return;
    }

    // Calculate watch percentage
    const watchPercentage =
      session.runtimeTicks > 0
        ? (session.positionTicks / session.runtimeTicks) * 100
        : 0;

    // Calculate watch duration in seconds (real time spent watching)
    const watchDurationSeconds =
      (new Date().getTime() - session.startedAt.getTime()) / 1000;

    // Calculate minutes watched based on actual watch duration (not position in media)
    // Use floor to avoid overestimating time
    const minutesWatched = Math.floor(watchDurationSeconds / 60);

    logger.debug(
      `Session ended: ${session.mediaTitle} - ${watchPercentage.toFixed(
        1
      )}% watched, ${watchDurationSeconds.toFixed(
        0
      )}s duration (${minutesWatched} mins)`,
      {
        label: 'Jellyfin Activity Monitor',
        sessionId: session.sessionId,
        userId: session.seerrUserId,
      }
    );

    // Track daily activity for any meaningful watch (at least 1 minute)
    const isCompletedWatch =
      watchPercentage >= userSettings.completionThreshold &&
      watchDurationSeconds >= userSettings.minWatchSeconds;

    const trackingSettings = getTrackingSettings();
    if (watchDurationSeconds >= trackingSettings.minActivitySeconds) {
      await this.recordDailyActivity(
        session.seerrUserId,
        minutesWatched,
        isCompletedWatch
      );
    }

    // Minimum 10 minutes (600 seconds) for partial watches to be saved in WatchHistory
    // This prevents flooding the database with very short sessions
    const minPartialWatchSeconds = 600;
    const shouldCreateWatchHistory =
      isCompletedWatch || watchDurationSeconds >= minPartialWatchSeconds;

    if (shouldCreateWatchHistory) {
      await this.createWatchHistoryEntry(
        session,
        minutesWatched,
        !isCompletedWatch
      );
    }
  }

  /**
   * Record daily activity for a user (for streak tracking)
   */
  private async recordDailyActivity(
    userId: number,
    minutesWatched: number,
    hasCompletedWatch: boolean
  ): Promise<void> {
    try {
      const dailyActivityRepository = getRepository(DailyActivity);

      // Get today's date in local timezone as YYYY-MM-DD
      const today = new Date();
      const activityDate = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Find or create today's activity record
      let activity = await dailyActivityRepository.findOne({
        where: {
          userId,
          activityDate,
        },
      });

      if (activity) {
        // Update existing record
        activity.totalMinutesWatched += minutesWatched;
        activity.sessionsCount += 1;
        if (hasCompletedWatch) {
          activity.hasCompletedWatch = true;
        }
      } else {
        // Create new record
        activity = new DailyActivity({
          userId,
          activityDate,
          totalMinutesWatched: minutesWatched,
          sessionsCount: 1,
          hasCompletedWatch,
        });
      }

      await dailyActivityRepository.save(activity);

      logger.debug(
        `Recorded daily activity for user ${userId}: ${minutesWatched} mins on ${activityDate}`,
        {
          label: 'Jellyfin Activity Monitor',
          totalMinutesToday: activity.totalMinutesWatched,
          sessionsToday: activity.sessionsCount,
        }
      );
    } catch (error) {
      logger.error('Failed to record daily activity', {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
        userId,
      });
    }
  }

  /**
   * Create a watch history entry for a session
   * @param session The session that ended
   * @param actualMinutesWatched The actual time spent watching (not media duration)
   * @param isPartialWatch Whether this is a partial watch (didn't meet completion criteria)
   */
  private async createWatchHistoryEntry(
    session: ActiveSession,
    actualMinutesWatched: number,
    isPartialWatch: boolean
  ): Promise<void> {
    try {
      const mediaRepository = getRepository(Media);
      const watchHistoryRepository = getRepository(WatchHistory);

      // Find or create media
      let media = await mediaRepository.findOne({
        where: {
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
        },
      });

      if (!media) {
        media = new Media({
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
        });
        await mediaRepository.save(media);

        logger.info(`Created new media entry for auto-sync`, {
          label: 'Jellyfin Activity Monitor',
          mediaId: media.id,
          tmdbId: session.tmdbId,
          mediaType: session.mediaType,
        });
      }

      // Check for existing entry today (deduplication)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const existingEntry = await watchHistoryRepository.findOne({
        where: {
          userId: session.seerrUserId,
          mediaId: media.id,
          seasonNumber:
            session.seasonNumber != null ? session.seasonNumber : IsNull(),
          episodeNumber:
            session.episodeNumber != null ? session.episodeNumber : IsNull(),
          watchedAt: Between(startOfDay, endOfDay),
        },
      });

      if (existingEntry) {
        // Update existing entry - accumulate minutes
        existingEntry.runtimeMinutes =
          (existingEntry.runtimeMinutes || 0) + actualMinutesWatched;
        existingEntry.watchedAt = new Date();
        // If this session completed the watch, mark it as no longer partial
        if (!isPartialWatch) {
          existingEntry.isPartialWatch = false;
        }
        await watchHistoryRepository.save(existingEntry);

        logger.debug(`Updated existing watch history entry`, {
          label: 'Jellyfin Activity Monitor',
          entryId: existingEntry.id,
          totalMinutes: existingEntry.runtimeMinutes,
          isPartialWatch: existingEntry.isPartialWatch,
        });

        // Update series progress only for completed watches
        if (!isPartialWatch && session.mediaType === MediaType.TV) {
          const mediaIdForProgress = media.id;
          seriesProgressService
            .updateProgress(
              session.seerrUserId,
              mediaIdForProgress,
              session.tmdbId
            )
            .catch((error) => {
              logger.error('Failed to update series progress after auto-sync', {
                label: 'Jellyfin Activity Monitor',
                userId: session.seerrUserId,
                mediaId: mediaIdForProgress,
                error: error.message,
              });
            });
        }

        // Always check badges - streak badges need partial watches to count as activity
        badgeService.checkAndAwardBadges(session.seerrUserId).catch((error) => {
          logger.error('Failed to check badges after auto-sync', {
            label: 'Jellyfin Activity Monitor',
            userId: session.seerrUserId,
            error: error.message,
          });
        });
      } else {
        // Use actual minutes watched (real session time), not media duration
        const runtimeMinutes =
          actualMinutesWatched > 0 ? actualMinutesWatched : undefined;

        // Create new entry
        const watchHistory = new WatchHistory({
          userId: session.seerrUserId,
          mediaId: media.id,
          mediaType: session.mediaType,
          seasonNumber: session.seasonNumber,
          episodeNumber: session.episodeNumber,
          runtimeMinutes,
          watchedAt: new Date(),
          isPartialWatch,
        });

        await watchHistoryRepository.save(watchHistory);

        logger.info(
          `Auto-synced watch: ${session.mediaTitle} for user ${session.seerrUserId}`,
          {
            label: 'Jellyfin Activity Monitor',
            tmdbId: session.tmdbId,
            mediaType: session.mediaType,
            isPartialWatch,
            runtimeMinutes,
          }
        );

        // Update series progress only for completed watches
        if (!isPartialWatch && session.mediaType === MediaType.TV && media) {
          const mediaIdForProgress = media.id;
          seriesProgressService
            .updateProgress(
              session.seerrUserId,
              mediaIdForProgress,
              session.tmdbId
            )
            .catch((error) => {
              logger.error('Failed to update series progress after auto-sync', {
                label: 'Jellyfin Activity Monitor',
                userId: session.seerrUserId,
                mediaId: mediaIdForProgress,
                error: error.message,
              });
            });
        }

        // Always check for badges - streak badges need partial watches to count
        badgeService.checkAndAwardBadges(session.seerrUserId).catch((error) => {
          logger.error('Failed to check badges after auto-sync', {
            label: 'Jellyfin Activity Monitor',
            userId: session.seerrUserId,
            error: error.message,
          });
        });
      }
    } catch (error) {
      logger.error('Failed to create watch history entry', {
        label: 'Jellyfin Activity Monitor',
        error: (error as Error).message,
        session: {
          tmdbId: session.tmdbId,
          userId: session.seerrUserId,
        },
      });
    }
  }

  /**
   * Get the Jellyfin hostname from settings
   */
  private getJellyfinHostname(): string | null {
    const settings = getSettings();
    if (!settings.jellyfin?.ip) {
      return null;
    }

    const protocol = settings.jellyfin.useSsl ? 'https' : 'http';
    const port = settings.jellyfin.port || 8096;
    const urlBase = settings.jellyfin.urlBase || '';

    return `${protocol}://${settings.jellyfin.ip}:${port}${urlBase}`;
  }
}

// Export singleton instance
const jellyfinActivityMonitor = new JellyfinActivityMonitor();
export default jellyfinActivityMonitor;
