/**
 * Test script to verify calendar sync is parsing Radarr/Sonarr data correctly
 */

import { fetchRadarrCalendar, fetchSonarrCalendar } from '@server/lib/calendar';
import logger from '@server/logger';

async function testCalendarFetch() {
  try {
    logger.info('Testing calendar fetch...');

    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Test Radarr
    logger.info('Fetching from Radarr...');
    const radarrItems = await fetchRadarrCalendar(now, endDate);
    logger.info(`✅ Fetched ${radarrItems.length} items from Radarr`);

    if (radarrItems.length > 0) {
      logger.info('Sample Radarr item:', {
        title: radarrItems[0].title,
        tmdbId: radarrItems[0].tmdbId,
        releaseDate: radarrItems[0].releaseDate,
        type: radarrItems[0].type,
      });
    }

    // Test Sonarr
    logger.info('Fetching from Sonarr...');
    const sonarrItems = await fetchSonarrCalendar(now, endDate);
    logger.info(`✅ Fetched ${sonarrItems.length} items from Sonarr`);

    if (sonarrItems.length > 0) {
      logger.info('Sample Sonarr item:', {
        title: sonarrItems[0].title,
        tmdbId: sonarrItems[0].tmdbId,
        tvdbId: sonarrItems[0].tvdbId,
        seasonNumber: sonarrItems[0].seasonNumber,
        episodeNumber: sonarrItems[0].episodeNumber,
        episodeTitle: sonarrItems[0].episodeTitle,
        releaseDate: sonarrItems[0].releaseDate,
        type: sonarrItems[0].type,
      });
    }

    logger.info('✅ Test complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

testCalendarFetch();
