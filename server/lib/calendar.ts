import type { RadarrMovie } from '@server/api/servarr/radarr';
import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import { getRepository } from '@server/datasource';
import CalendarCache from '@server/entity/CalendarCache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { LessThan } from 'typeorm';

// Extended interfaces for calendar-specific data
interface RadarrMovieCalendar extends RadarrMovie {
  digitalRelease?: string;
  physicalRelease?: string;
  inCinemas?: string;
  overview?: string;
  status?: string;
}

interface SonarrEpisodeCalendar {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDateUtc: string;
  overview: string;
  hasFile: boolean;
  monitored: boolean;
  series?: {
    title: string;
    tvdbId: number;
    tmdbId?: number;
  };
  tvdbId?: number;
}

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
      const radarr = new RadarrAPI({
        url: RadarrAPI.buildUrl(radarrSettings),
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

      // Transform to CalendarCache
      for (const movie of calendar) {
        const movieData = movie as RadarrMovieCalendar;

        // Determine release date (prefer digital, then physical, then in cinemas)
        let releaseDate: Date | null = null;
        if (movieData.digitalRelease) {
          releaseDate = new Date(movieData.digitalRelease);
        } else if (movieData.physicalRelease) {
          releaseDate = new Date(movieData.physicalRelease);
        } else if (movieData.inCinemas) {
          releaseDate = new Date(movieData.inCinemas);
        }

        if (!releaseDate || isNaN(releaseDate.getTime())) {
          logger.debug(
            `Skipping movie ${movie.title} - no valid release date`,
            {
              label: 'Calendar Sync',
            }
          );
          continue;
        }

        results.push(
          new CalendarCache({
            type: 'movie',
            tmdbId: movie.tmdbId,
            title: movie.title,
            releaseDate,
            overview: movieData.overview || '',
            status: movieData.status || 'announced',
            monitored: movie.monitored,
            hasFile: movie.hasFile,
            radarrId: movie.id,
            externalSource: 'radarr',
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
        url: SonarrAPI.buildUrl(sonarrSettings),
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

      // Transform to CalendarCache
      for (const episode of calendar) {
        const episodeData = episode as unknown as SonarrEpisodeCalendar;

        if (!episodeData.airDateUtc) {
          logger.debug(
            `Skipping episode S${episodeData.seasonNumber}E${episodeData.episodeNumber} - no air date`,
            {
              label: 'Calendar Sync',
            }
          );
          continue;
        }

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
            overview: episodeData.overview || '',
            status: episodeData.hasFile ? 'released' : 'announced',
            monitored: episodeData.monitored,
            hasFile: episodeData.hasFile,
            sonarrId: episodeData.seriesId,
            externalSource: 'sonarr',
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
