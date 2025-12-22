import TheMovieDb from '@server/api/themoviedb';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import logger from '@server/logger';
import { Router } from 'express';

const availableRoutes = Router();

// In-memory cache for enriched media data (expires after 5 minutes)
const enrichedMediaCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

logger.info('🔥 AVAILABLE ROUTES MODULE LOADED', { label: 'Available Routes' });

/**
 * GET /api/v1/available/movies
 *
 * Returns movies/TV shows that are AVAILABLE in library (status = 4 or 5)
 * - Status 4: Partially available (some episodes/quality missing)
 * - Status 5: Fully available
 * Matches OpenAPI schema: /available/movies
 * DB-only queries for maximum performance (no TMDB calls)
 *
 * Query params (validated by OpenAPI):
 * - page: integer (default 1)
 * - type: 'movie' | 'tv' (default 'movie')
 * - sortBy: 'mediaAddedAt' | 'popularity' | 'releaseDate' | 'rating' | 'title'
 * - genre: integer (TMDB genre ID)
 * - year: string (YYYY format)
 * - search: string (title search)
 */
availableRoutes.get('/movies', async (req, res, next) => {
  try {
    // Parse and validate query params (OpenAPI validates first)
    const page = parseInt(req.query.page as string) || 1;
    const mediaType = (req.query.type as string) || 'movie';
    const sortBy = (req.query.sortBy as string) || 'mediaAddedAt';
    const genre = req.query.genre
      ? parseInt(req.query.genre as string)
      : undefined;
    const genres = req.query.genres
      ? (req.query.genres as string).split(',').map(Number)
      : undefined;
    const studio = req.query.studio
      ? parseInt(req.query.studio as string)
      : undefined;
    const network = req.query.network
      ? parseInt(req.query.network as string)
      : undefined;
    const year = req.query.year as string;
    const releaseYear = req.query.releaseYear as string;
    const search = req.query.search as string;
    const originalLanguages = req.query.originalLanguages
      ? (req.query.originalLanguages as string).split(',')
      : undefined;
    const take = 20;
    const skip = (page - 1) * take;

    logger.debug('Available movies request', {
      label: 'Available Media',
      page,
      mediaType,
      filters: {
        sortBy,
        genre,
        genres,
        studio,
        network,
        year,
        releaseYear,
        search,
        originalLanguages,
      },
      user: req.user?.displayName,
    });

    const mediaRepo = getRepository(Media);

    // Build simple query - Media entity only has: id, tmdbId, tvdbId, status, mediaAddedAt
    // Include both partially (4) and fully (5) available media
    const queryBuilder = mediaRepo
      .createQueryBuilder('media')
      .where('media.status IN (:...statuses)', { statuses: [4, 5] }) // PARTIALLY or FULLY AVAILABLE
      .andWhere('media.mediaType = :type', { type: mediaType });

    // Default sort: Recently Added (DESC = most recent first)
    queryBuilder.orderBy('media.mediaAddedAt', 'DESC');

    // Get total count for pagination
    const totalCount = await queryBuilder.getCount();

    // When filters are active (genre/studio/network), we need to fetch more items
    // because filtering happens client-side after TMDB enrichment
    // Limit to reasonable number (200) to balance completeness vs performance
    const hasFilters =
      genre ||
      genres ||
      studio ||
      network ||
      year ||
      releaseYear ||
      search ||
      originalLanguages;

    let items;
    if (hasFilters) {
      // Fetch more items when filters are active (but not ALL to avoid performance hit)
      // 200 items should cover most use cases while keeping response time reasonable
      items = await queryBuilder.take(200).getMany();
      logger.debug(`Fetched ${items.length} items for filtering`, {
        label: 'Available Media',
        filters: {
          genre,
          genres,
          studio,
          network,
          year,
          releaseYear,
          search,
          originalLanguages,
        },
      });
    } else {
      // Normal pagination when no filters
      items = await queryBuilder.skip(skip).take(take).getMany();
      logger.debug(`Fetched ${items.length} items (page ${page})`, {
        label: 'Available Media',
      });
    }

    // Fetch TMDB details for all items (with caching)
    const tmdb = new TheMovieDb();
    const results = await Promise.all(
      items.map(async (m) => {
        // Check cache first
        const cacheKey = `${m.mediaType}-${m.tmdbId}`;
        const cached = enrichedMediaCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.data;
        }

        try {
          // Fetch movie or TV show details from TMDB
          const tmdbData =
            mediaType === 'movie'
              ? await tmdb.getMovie({ movieId: m.tmdbId })
              : await tmdb.getTvShow({ tvId: m.tmdbId });

          const enrichedData = {
            id: tmdbData.id,
            mediaType: m.mediaType,
            title: 'title' in tmdbData ? tmdbData.title : tmdbData.name,
            originalTitle:
              'original_title' in tmdbData
                ? tmdbData.original_title
                : tmdbData.original_name,
            posterPath: tmdbData.poster_path,
            backdropPath: tmdbData.backdrop_path,
            overview: tmdbData.overview,
            releaseDate:
              'release_date' in tmdbData
                ? tmdbData.release_date
                : tmdbData.first_air_date,
            voteAverage: tmdbData.vote_average,
            voteCount: tmdbData.vote_count,
            popularity: tmdbData.popularity,
            genreIds: tmdbData.genres?.map((g: any) => g.id) || [],
            productionCompanyIds:
              'production_companies' in tmdbData
                ? tmdbData.production_companies?.map((c: any) => c.id) || []
                : [],
            networkIds:
              'networks' in tmdbData
                ? tmdbData.networks?.map((n: any) => n.id) || []
                : [],
            adult: 'adult' in tmdbData ? tmdbData.adult : false,
            video: false,
            mediaInfo: {
              id: m.id,
              tmdbId: m.tmdbId,
              tvdbId: m.tvdbId,
              status: m.status,
              status4k: m.status4k,
              downloadStatus: [],
              mediaAddedAt: m.mediaAddedAt,
            },
          };

          // Cache the enriched data
          enrichedMediaCache.set(cacheKey, {
            data: enrichedData,
            timestamp: Date.now(),
          });

          return enrichedData;
        } catch (error) {
          logger.warn(`Failed to fetch TMDB data for ${m.tmdbId}`, {
            label: 'Available Media',
            error: (error as Error).message,
          });
          // Return minimal data if TMDB fetch fails
          return {
            id: m.tmdbId,
            mediaType: m.mediaType,
            title: `Media ${m.tmdbId}`,
            originalTitle: null,
            posterPath: null,
            backdropPath: null,
            overview: null,
            releaseDate: null,
            voteAverage: null,
            voteCount: null,
            popularity: null,
            genreIds: [],
            productionCompanyIds: [],
            networkIds: [],
            adult: false,
            video: false,
            mediaInfo: {
              id: m.id,
              tmdbId: m.tmdbId,
              tvdbId: m.tvdbId,
              status: m.status,
              status4k: m.status4k,
              downloadStatus: [],
              mediaAddedAt: m.mediaAddedAt,
            },
          };
        }
      })
    );

    // Apply client-side filtering (since DB doesn't have TMDB metadata)
    let filteredResults = results;

    // Filter by genre (single)
    if (genre) {
      filteredResults = filteredResults.filter(
        (r: any) => Array.isArray(r.genreIds) && r.genreIds.includes(genre)
      );
    }

    // Filter by genres (multiple - must have ALL selected genres)
    if (genres && genres.length > 0) {
      filteredResults = filteredResults.filter(
        (r: any) =>
          Array.isArray(r.genreIds) &&
          genres.every((g) => r.genreIds.includes(g))
      );
    }

    // Filter by studio (production company)
    if (studio) {
      filteredResults = filteredResults.filter(
        (r: any) =>
          Array.isArray(r.productionCompanyIds) &&
          r.productionCompanyIds.includes(studio)
      );
    }

    // Filter by network
    if (network) {
      filteredResults = filteredResults.filter(
        (r: any) =>
          Array.isArray(r.networkIds) && r.networkIds.includes(network)
      );
    }

    // Filter by year (legacy single year param)
    if (year) {
      filteredResults = filteredResults.filter((r: any) => {
        if (!r.releaseDate) return false;
        return r.releaseDate.startsWith(year);
      });
    }

    // Filter by release year (new param from FilterSlideover)
    if (releaseYear) {
      filteredResults = filteredResults.filter((r: any) => {
        if (!r.releaseDate) return false;
        return r.releaseDate.startsWith(releaseYear);
      });
    }

    // Filter by original language
    if (originalLanguages && originalLanguages.length > 0) {
      filteredResults = filteredResults.filter(
        (r: any) =>
          r.originalLanguage && originalLanguages.includes(r.originalLanguage)
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResults = filteredResults.filter(
        (r: any) =>
          r.title.toLowerCase().includes(searchLower) ||
          (r.originalTitle &&
            r.originalTitle.toLowerCase().includes(searchLower))
      );
    }

    // Apply client-side sorting after filtering
    const sortedResults = [...filteredResults];

    switch (sortBy) {
      case 'popularity':
        sortedResults.sort(
          (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
        );
        break;
      case 'releaseDate':
        sortedResults.sort((a: any, b: any) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'rating':
        sortedResults.sort(
          (a: any, b: any) => (b.voteAverage || 0) - (a.voteAverage || 0)
        );
        break;
      case 'title':
        sortedResults.sort((a: any, b: any) => a.title.localeCompare(b.title));
        break;
      case 'mediaAddedAt':
      default:
        // Already sorted by DB query (mediaAddedAt DESC)
        break;
    }

    // Apply pagination AFTER filtering
    const totalFiltered = sortedResults.length;

    // Only apply client-side pagination if we fetched all items (with filters)
    // Otherwise, DB already paginated for us
    const paginatedResults = hasFilters
      ? sortedResults.slice(skip, skip + take)
      : sortedResults;

    // Use totalFiltered for filtered queries, totalCount for non-filtered
    const finalTotal = hasFilters ? totalFiltered : totalCount;

    logger.info(
      `Returning ${paginatedResults.length} results (filtered: ${totalFiltered}, total: ${totalCount})`,
      {
        label: 'Available Media',
        page,
        totalPages: Math.ceil(finalTotal / take),
      }
    );

    // Return response matching OpenAPI schema
    return res.status(200).json({
      page,
      totalPages: Math.ceil(finalTotal / take),
      totalResults: finalTotal,
      results: paginatedResults,
    });
  } catch (error) {
    logger.error('Error in /available/movies', {
      label: 'Available Media',
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return next({
      status: 500,
      message: 'Failed to load available movies',
    });
  }
});

export default availableRoutes;
