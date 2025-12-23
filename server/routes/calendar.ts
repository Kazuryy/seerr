import { getRepository } from '@server/datasource';
import CalendarCache from '@server/entity/CalendarCache';
import { Watchlist } from '@server/entity/Watchlist';
import logger from '@server/logger';
import { Router } from 'express';

const calendarRoutes = Router();

interface CalendarItem {
  type: string;
  tmdbId: number;
  tvdbId?: number;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  releaseDate: Date;
  overview?: string;
  status: string;
  inWatchlist: boolean;
  countdown: number;
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarResponse {
  results: CalendarDay[];
}

/**
 * GET /api/v1/calendar/upcoming
 * Returns upcoming movies and TV episodes from Radarr/Sonarr calendars
 *
 * @query start - Start date (ISO format), default: today
 * @query end - End date (ISO format), default: today + 7 days
 * @query watchlistOnly - Filter to watchlist items only, default: true
 * @query type - Filter by media type (movie|tv|all), default: all
 */
calendarRoutes.get<never, CalendarResponse>(
  '/upcoming',
  async (req, res, next) => {
    try {
      // 1. Parse query params
      const now = new Date();
      const startDate = req.query.start
        ? new Date(req.query.start as string)
        : now;
      const endDate = req.query.end
        ? new Date(req.query.end as string)
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
      const watchlistOnly = req.query.watchlistOnly !== 'false'; // default true
      const type = (req.query.type as string) || 'all';

      // 2. Fetch from cache
      const repository = getRepository(CalendarCache);
      let query = repository
        .createQueryBuilder('calendar')
        .where('calendar.releaseDate BETWEEN :start AND :end', {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        })
        .orderBy('calendar.releaseDate', 'ASC');

      // Filter by type if specified
      if (type !== 'all') {
        query = query.andWhere('calendar.type = :type', { type });
      }

      const cacheItems = await query.getMany();

      // 3. Get user's watchlist (Seerr watchlist only)
      let watchlistTmdbIds: Set<number> = new Set();
      if (req.user) {
        const watchlistRepo = getRepository(Watchlist);
        const watchlistItems = await watchlistRepo.find({
          where: { requestedBy: { id: req.user.id } },
          select: ['tmdbId'],
        });
        watchlistTmdbIds = new Set(watchlistItems.map((w) => w.tmdbId));
      }

      // 4. Filter by watchlist if needed
      let filteredItems = cacheItems;
      if (watchlistOnly) {
        filteredItems = cacheItems.filter((item) =>
          watchlistTmdbIds.has(item.tmdbId)
        );
      }

      // 5. Transform items and add watchlist status
      const itemsWithWatchlist: CalendarItem[] = filteredItems.map((item) => {
        const inWatchlist = watchlistTmdbIds.has(item.tmdbId);
        const countdown = Math.floor(
          (new Date(item.releaseDate).getTime() - Date.now()) / 1000
        );

        return {
          type: item.type,
          tmdbId: item.tmdbId,
          tvdbId: item.tvdbId,
          title: item.title,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          episodeTitle: item.episodeTitle,
          releaseDate: item.releaseDate,
          overview: item.overview,
          status: item.status,
          inWatchlist,
          countdown: countdown > 0 ? countdown : 0,
        };
      });

      // 6. Group by date
      const groupedByDate = itemsWithWatchlist.reduce((acc, item) => {
        const date = new Date(item.releaseDate).toISOString().split('T')[0];

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);

        return acc;
      }, {} as Record<string, CalendarItem[]>);

      // 7. Format response
      const results: CalendarDay[] = Object.entries(groupedByDate).map(
        ([date, items]) => ({
          date,
          items,
        })
      );

      logger.info('Calendar upcoming fetched', {
        label: 'Calendar API',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        watchlistOnly,
        type,
        resultCount: filteredItems.length,
      });

      return res.status(200).json({ results });
    } catch (error) {
      logger.error('Failed to fetch calendar upcoming', {
        label: 'Calendar API',
        errorMessage: (error as Error).message,
        error,
      });
      return next({
        status: 500,
        message: 'Failed to fetch calendar data',
      });
    }
  }
);

export default calendarRoutes;
