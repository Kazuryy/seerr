import type { RadarrMovie } from '@server/api/servarr/radarr';
import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import { getRepository } from '@server/datasource';
import CalendarCache from '@server/entity/CalendarCache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { LessThan } from 'typeorm';

/**
 * Fetches calendar data from all configured Radarr servers
 */
export async function fetchRadarrCalendar(
  startDate: Date,
  endDate: Date
): Promise<CalendarCache[]> {
  const settings = getSettings();
  const results: CalendarCache[] = [];

  if (!settings.radarr || settings.radarr.length === 0) {
    logger.debug('No Radarr servers configured', {
      label: 'Calendar Sync',
    });
    return results;
  }

  // Loop through all configured Radarr servers
  for (const radarrSettings of settings.radarr) {
    try {
      const radarrUrl = `http${radarrSettings.useSsl ? 's' : ''}://${
        radarrSettings.hostname
      }:${radarrSettings.port}${radarrSettings.baseUrl || ''}/api/v3`;

      logger.debug('Connecting to Radarr server for calendar', {
        label: 'Calendar Sync',
        server: radarrSettings.hostname,
        url: radarrUrl,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${
          endDate.toISOString().split('T')[0]
        }`,
      });

      const radarr = new RadarrAPI({
        url: radarrUrl,
        apiKey: radarrSettings.apiKey,
      });

      // Call calendar endpoint
      const calendar = await radarr.getCalendar(startDate, endDate);

      logger.debug(
        `Fetched ${calendar.length} movies from Radarr server: ${radarrSettings.hostname}`,
        {
          label: 'Calendar Sync',
        }
      );

      // DEBUG - Save to file
      if (process.env.NODE_ENV !== 'production' && calendar.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        const debugDir = path.join(__dirname, '../../debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(debugDir, 'radarr-response.json'),
          JSON.stringify(calendar, null, 2)
        );
        logger.info('🔍 Radarr response saved to debug/radarr-response.json', {
          label: 'Calendar Sync',
        });
      }

      // DEBUG - Log first movie structure
      if (calendar.length > 0) {
        logger.debug('Sample Radarr movie structure:', {
          label: 'Calendar Sync',
          sample: JSON.stringify(calendar[0], null, 2).substring(0, 1000),
        });
      } else {
        logger.warn(
          `Radarr calendar returned 0 movies for range ${startDate.toISOString()} to ${endDate.toISOString()}`,
          {
            label: 'Calendar Sync',
            server: radarrSettings.hostname,
          }
        );
      }

      // Transform to CalendarCache
      for (const movie of calendar) {
        const movieData = movie as RadarrMovie & {
          images?: { coverType: string; remoteUrl: string }[];
          digitalRelease?: string;
          physicalRelease?: string;
          inCinemas?: string;
          overview?: string;
          status?: string;
        };

        // Extract fields safely
        const title = movieData.title || 'Unknown';
        const tmdbId = movieData.tmdbId || 0;

        // Helper to parse date - handles both ISO format and YYYY-MM-DD
        const parseDate = (dateStr: string | undefined): Date | null => {
          if (!dateStr) return null;
          // If it already contains time component, parse directly
          if (dateStr.includes('T')) {
            return new Date(dateStr);
          }
          // Otherwise treat as date-only string
          return new Date(dateStr + 'T00:00:00.000Z');
        };

        // Determine release date and type (prefer digital, then physical, then in cinemas)
        let releaseDate: Date | null = null;
        let releaseType: string | undefined;

        if (movieData.digitalRelease) {
          releaseDate = parseDate(movieData.digitalRelease);
          releaseType = 'digital';
        } else if (movieData.physicalRelease) {
          releaseDate = parseDate(movieData.physicalRelease);
          releaseType = 'physical';
        } else if (movieData.inCinemas) {
          releaseDate = parseDate(movieData.inCinemas);
          releaseType = 'inCinemas';
        }

        if (!releaseDate || isNaN(releaseDate.getTime())) {
          logger.debug(`Skipping movie ${title} - no valid release date`, {
            label: 'Calendar Sync',
            digitalRelease: movieData.digitalRelease,
            physicalRelease: movieData.physicalRelease,
            inCinemas: movieData.inCinemas,
          });
          continue;
        }

        results.push(
          new CalendarCache({
            type: 'movie',
            tmdbId: tmdbId,
            title: title,
            releaseDate,
            releaseType,
            overview: movieData.overview || '',
            status: movieData.status || 'announced',
            monitored: movieData.monitored || false,
            hasFile: movieData.hasFile || false,
            radarrId: movieData.id || 0,
            externalSource: 'radarr',
            posterPath: movieData.images?.find(
              (img) => img.coverType === 'poster'
            )?.remoteUrl,
            backdropPath: movieData.images?.find(
              (img) => img.coverType === 'fanart'
            )?.remoteUrl,
            // TV-specific fields are undefined
            tvdbId: undefined,
            seasonNumber: undefined,
            episodeNumber: undefined,
            episodeTitle: undefined,
            sonarrId: undefined,
          })
        );
      }
    } catch (error) {
      logger.warn('Failed to fetch Radarr calendar', {
        label: 'Calendar Sync',
        server: radarrSettings.hostname,
        errorMessage: (error as Error).message,
      });
    }
  }

  return results;
}

/**
 * Fetches calendar data from all configured Sonarr servers
 */
export async function fetchSonarrCalendar(
  startDate: Date,
  endDate: Date
): Promise<CalendarCache[]> {
  const settings = getSettings();
  const results: CalendarCache[] = [];

  if (!settings.sonarr || settings.sonarr.length === 0) {
    logger.debug('No Sonarr servers configured', {
      label: 'Calendar Sync',
    });
    return results;
  }

  // Loop through all configured Sonarr servers
  for (const sonarrSettings of settings.sonarr) {
    try {
      const sonarr = new SonarrAPI({
        url: `http${sonarrSettings.useSsl ? 's' : ''}://${
          sonarrSettings.hostname
        }:${sonarrSettings.port}${sonarrSettings.baseUrl || ''}/api/v3`,
        apiKey: sonarrSettings.apiKey,
      });

      // Call calendar endpoint with includeSeries to get series details
      const calendar = await sonarr.getCalendar(startDate, endDate);

      logger.debug(
        `Fetched ${calendar.length} episodes from Sonarr server: ${sonarrSettings.hostname}`,
        {
          label: 'Calendar Sync',
        }
      );

      // DEBUG - Save to file
      if (process.env.NODE_ENV !== 'production' && calendar.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        const debugDir = path.join(__dirname, '../../debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(debugDir, 'sonarr-response.json'),
          JSON.stringify(calendar, null, 2)
        );
        logger.info('🔍 Sonarr response saved to debug/sonarr-response.json', {
          label: 'Calendar Sync',
        });
      }

      // DEBUG - Log first episode structure
      if (calendar.length > 0) {
        logger.debug('Sample Sonarr episode structure:', {
          label: 'Calendar Sync',
          sample: JSON.stringify(calendar[0], null, 2).substring(0, 1000),
        });
      }

      // Transform to CalendarCache
      for (const episode of calendar) {
        const episodeData = episode as {
          airDate?: string;
          airDateUtc: string;
          seasonNumber: number;
          episodeNumber: number;
          title: string;
          overview?: string;
          hasFile: boolean;
          monitored: boolean;
          seriesId: number;
          tvdbId?: number;
          series?: {
            title: string;
            tmdbId?: number;
            tvdbId?: number;
            images?: { coverType: string; remoteUrl: string }[];
          };
        };

        // Use airDate (local date like "2025-12-23") instead of airDateUtc
        // to match the calendar view which shows releases by local date
        if (!episodeData.airDate) {
          logger.debug(
            `Skipping episode S${episodeData.seasonNumber}E${episodeData.episodeNumber} - no air date`,
            {
              label: 'Calendar Sync',
            }
          );
          continue;
        }

        // Use airDateUtc which includes the real broadcast time
        const releaseDate = new Date(episodeData.airDateUtc);
        if (isNaN(releaseDate.getTime())) {
          continue;
        }

        // Get series info from episode (Sonarr includes series data when includeSeries=true)
        const series = episodeData.series;

        // Get IDs with proper fallbacks
        const tmdbId = series?.tmdbId || 0;
        const tvdbId = series?.tvdbId || episodeData.tvdbId || undefined;

        // Log if TVDB ID is missing for debugging
        if (!tvdbId) {
          logger.debug(
            `Episode ${series?.title || 'Unknown'} S${
              episodeData.seasonNumber
            }E${episodeData.episodeNumber} missing TVDB ID`,
            {
              label: 'Calendar Sync',
            }
          );
        }

        results.push(
          new CalendarCache({
            type: 'tv',
            tmdbId,
            tvdbId,
            title: series?.title || 'Unknown Series',
            seasonNumber: episodeData.seasonNumber,
            episodeNumber: episodeData.episodeNumber,
            episodeTitle: episodeData.title,
            releaseDate,
            releaseType: 'premiere',
            overview: episodeData.overview || '',
            status: episodeData.hasFile ? 'released' : 'announced',
            monitored: episodeData.monitored,
            hasFile: episodeData.hasFile,
            sonarrId: episodeData.seriesId,
            externalSource: 'sonarr',
            posterPath: series?.images?.find(
              (img) => img.coverType === 'poster'
            )?.remoteUrl,
            backdropPath: series?.images?.find(
              (img) => img.coverType === 'fanart'
            )?.remoteUrl,
            // Movie-specific fields are undefined
            radarrId: undefined,
          })
        );
      }
    } catch (error) {
      logger.warn('Failed to fetch Sonarr calendar', {
        label: 'Calendar Sync',
        server: sonarrSettings.hostname,
        errorMessage: (error as Error).message,
      });
    }
  }

  return results;
}

/**
 * Clears old calendar entries from the cache
 */
export async function clearOldCache(beforeDate: Date): Promise<number> {
  const repository = getRepository(CalendarCache);

  try {
    const result = await repository.delete({
      releaseDate: LessThan(beforeDate),
    });

    return result.affected || 0;
  } catch (error) {
    logger.error('Failed to clear old cache', {
      label: 'Calendar Sync',
      errorMessage: (error as Error).message,
      error,
    });
    return 0;
  }
}

/**
 * Saves calendar items to the cache
 * Clears all existing entries first to avoid duplicates
 */
export async function saveToCache(items: CalendarCache[]): Promise<void> {
  const repository = getRepository(CalendarCache);

  try {
    // Clear entire cache first (simple approach)
    await repository.clear();

    // Batch insert new items
    if (items.length > 0) {
      await repository.save(items, { chunk: 100 });
      logger.debug(`Saved ${items.length} items to calendar cache`, {
        label: 'Calendar Sync',
      });
    }
  } catch (error) {
    logger.error('Failed to save to cache', {
      label: 'Calendar Sync',
      errorMessage: (error as Error).message,
      error,
    });
    throw error;
  }
}
