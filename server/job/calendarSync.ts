import type CalendarCache from '@server/entity/CalendarCache';
import {
  clearOldCache,
  fetchRadarrCalendar,
  fetchSonarrCalendar,
  saveToCache,
} from '@server/lib/calendar';
import logger from '@server/logger';

/**
 * Syncs calendar data from Radarr and Sonarr into the calendar cache
 * Runs on schedule to keep upcoming releases up to date
 */
export const calendarSync = async (): Promise<void> => {
  logger.info('Starting calendar sync job', { label: 'Calendar Sync' });

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Sync from 60 days ago (2 months) to 180 days in the future (6 months)
    const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // -60 days (2 months)
    const endDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // +180 days (6 months)

    logger.info('Starting calendar sync job (2 months past, 6 months future)', {
      label: 'Calendar Sync',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // 1. Clear old cache (older than 60 days ago)
    const cacheRetentionDate = new Date(
      now.getTime() - 60 * 24 * 60 * 60 * 1000
    );
    const deletedCount = await clearOldCache(cacheRetentionDate);
    logger.debug(`Cleared ${deletedCount} old calendar entries`, {
      label: 'Calendar Sync',
    });

    // 2. Fetch from Radarr
    const radarrItems = await fetchRadarrCalendar(startDate, endDate);
    logger.debug(`Fetched ${radarrItems.length} items from Radarr`, {
      label: 'Calendar Sync',
    });

    // 3. Fetch from Sonarr
    const sonarrItems = await fetchSonarrCalendar(startDate, endDate);
    logger.debug(`Fetched ${sonarrItems.length} items from Sonarr`, {
      label: 'Calendar Sync',
    });

    // 4. Save all to cache
    const allItems: CalendarCache[] = [...radarrItems, ...sonarrItems];
    await saveToCache(allItems);

    logger.info(
      `Calendar sync complete: ${radarrItems.length} movies, ${sonarrItems.length} episodes (${allItems.length} total)`,
      { label: 'Calendar Sync' }
    );
  } catch (error) {
    logger.error('Calendar sync failed', {
      label: 'Calendar Sync',
      errorMessage: (error as Error).message,
      error,
    });
  }
};

// For manual testing via CLI
if (require.main === module) {
  // Import datasource to initialize database connection
  import('@server/datasource')
    .then((datasource) => {
      logger.info('Initializing database connection...');
      return datasource.default.initialize();
    })
    .then(() => {
      logger.info('Database initialized, starting manual calendar sync');
      return calendarSync();
    })
    .then(() => {
      logger.info('Manual calendar sync complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Manual calendar sync failed', {
        errorMessage: (error as Error).message,
        error,
      });
      process.exit(1);
    });
}
