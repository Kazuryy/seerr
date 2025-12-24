import type { RadarrMovie } from '@server/api/servarr/radarr';
import RadarrAPI from '@server/api/servarr/radarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import { calendarExtendedCache } from '@server/lib/calendarExtendedCache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

export interface SonarrEpisode {
  seriesId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview: string;
  hasFile: boolean;
  monitored: boolean;
  id: number;
  series?: {
    title: string;
    tvdbId?: number;
    images?: { coverType: string; url: string }[];
  };
}

/**
 * Fetch calendar directly from Radarr (bypassing DB)
 * Used for extended date ranges (90+ days)
 */
export const fetchRadarrCalendarDirect = async (
  start: Date,
  end: Date
): Promise<RadarrMovie[]> => {
  // Check extended cache first
  const cached = calendarExtendedCache.get(start, end, 'radarr');
  if (cached) {
    return cached as RadarrMovie[];
  }

  const settings = getSettings();
  const radarrSettings = settings.radarr;

  if (!radarrSettings || radarrSettings.length === 0) {
    logger.warn('No Radarr servers configured', {
      label: 'Calendar Direct',
    });
    return [];
  }

  const allMovies: RadarrMovie[] = [];

  for (const server of radarrSettings) {
    try {
      const radarr = new RadarrAPI({
        url: `http${server.useSsl ? 's' : ''}://${server.hostname}:${
          server.port
        }${server.baseUrl || ''}/api/v3`,
        apiKey: server.apiKey,
      });

      logger.debug(
        `Fetching Radarr calendar directly: ${
          start.toISOString().split('T')[0]
        } to ${end.toISOString().split('T')[0]}`,
        {
          label: 'Calendar Direct',
          server: server.hostname,
        }
      );

      const calendar = await radarr.getCalendar(start, end);

      allMovies.push(...calendar);

      logger.debug(`Fetched ${calendar.length} movies from Radarr (direct)`, {
        label: 'Calendar Direct',
        server: server.hostname,
      });
    } catch (err) {
      logger.error('Failed to fetch Radarr calendar directly', {
        label: 'Calendar Direct',
        errorMessage: (err as Error).message,
        server: server.hostname,
      });
    }
  }

  // Cache for 30 minutes
  calendarExtendedCache.set(start, end, 'radarr', allMovies);

  return allMovies;
};

/**
 * Fetch calendar directly from Sonarr (bypassing DB)
 * Used for extended date ranges (90+ days)
 */
export const fetchSonarrCalendarDirect = async (
  start: Date,
  end: Date
): Promise<SonarrEpisode[]> => {
  // Check extended cache first
  const cached = calendarExtendedCache.get(start, end, 'sonarr');
  if (cached) {
    return cached as SonarrEpisode[];
  }

  const settings = getSettings();
  const sonarrSettings = settings.sonarr;

  if (!sonarrSettings || sonarrSettings.length === 0) {
    logger.warn('No Sonarr servers configured', {
      label: 'Calendar Direct',
    });
    return [];
  }

  const allEpisodes: SonarrEpisode[] = [];

  for (const server of sonarrSettings) {
    try {
      const sonarr = new SonarrAPI({
        url: `http${server.useSsl ? 's' : ''}://${server.hostname}:${
          server.port
        }${server.baseUrl || ''}/api/v3`,
        apiKey: server.apiKey,
      });

      logger.debug(
        `Fetching Sonarr calendar directly: ${
          start.toISOString().split('T')[0]
        } to ${end.toISOString().split('T')[0]}`,
        {
          label: 'Calendar Direct',
          server: server.hostname,
        }
      );

      const calendar = await sonarr.getCalendar(start, end);

      allEpisodes.push(...calendar);

      logger.debug(`Fetched ${calendar.length} episodes from Sonarr (direct)`, {
        label: 'Calendar Direct',
        server: server.hostname,
      });
    } catch (err) {
      logger.error('Failed to fetch Sonarr calendar directly', {
        label: 'Calendar Direct',
        errorMessage: (err as Error).message,
        server: server.hostname,
      });
    }
  }

  // Cache for 30 minutes
  calendarExtendedCache.set(start, end, 'sonarr', allEpisodes);

  return allEpisodes;
};
