import GithubAPI from '@server/api/github';
import PushoverAPI from '@server/api/pushover';
import TheMovieDb from '@server/api/themoviedb';
import type {
  TmdbMovieResult,
  TmdbTvResult,
} from '@server/api/themoviedb/interfaces';
import { getRepository } from '@server/datasource';
import DiscoverSlider from '@server/entity/DiscoverSlider';
import Media from '@server/entity/Media';
import type { StatusResponse } from '@server/interfaces/api/settingsInterfaces';
import { Permission } from '@server/lib/permissions';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { checkUser, isAuthenticated } from '@server/middleware/auth';
import { mapWatchProviderDetails } from '@server/models/common';
import { mapProductionCompany } from '@server/models/Movie';
import { mapNetwork } from '@server/models/Tv';
import overrideRuleRoutes from '@server/routes/overrideRule';
import settingsRoutes from '@server/routes/settings';
import watchlistRoutes from '@server/routes/watchlist';
import {
  appDataPath,
  appDataPermissions,
  appDataStatus,
} from '@server/utils/appDataVolume';
import { getAppVersion, getCommitTag } from '@server/utils/appVersion';
import restartFlag from '@server/utils/restartFlag';
import { isPerson } from '@server/utils/typeHelpers';
import { Router } from 'express';
import authRoutes from './auth';
import availableRoutes from './available';
import blacklistRoutes from './blacklist';
import calendarRoutes from './calendar';
import collectionRoutes from './collection';
import deletionRoutes from './deletion';
import discoverRoutes, { createTmdbWithRegionLanguage } from './discover';
import issueRoutes from './issue';
import issueCommentRoutes from './issueComment';
import mediaRoutes from './media';
import movieRoutes from './movie';
import personRoutes from './person';
import requestRoutes from './request';
import searchRoutes from './search';
import serviceRoutes from './service';
import testRoutes from './test';
import tvRoutes from './tv';
import user from './user';

const router = Router();

router.use(checkUser);

router.get<unknown, StatusResponse>('/status', async (req, res) => {
  const githubApi = new GithubAPI();

  const currentVersion = getAppVersion();
  const commitTag = getCommitTag();
  let updateAvailable = false;
  let commitsBehind = 0;

  if (currentVersion.startsWith('develop-') && commitTag !== 'local') {
    const commits = await githubApi.getSeerrCommits();

    if (commits.length) {
      const filteredCommits = commits.filter(
        (commit) => !commit.commit.message.includes('[skip ci]')
      );
      if (filteredCommits[0].sha !== commitTag) {
        updateAvailable = true;
      }

      const commitIndex = filteredCommits.findIndex(
        (commit) => commit.sha === commitTag
      );

      if (updateAvailable) {
        commitsBehind = commitIndex;
      }
    }
  } else if (commitTag !== 'local') {
    const releases = await githubApi.getSeerrReleases();

    if (releases.length) {
      const latestVersion = releases[0];

      if (!latestVersion.name.includes(currentVersion)) {
        updateAvailable = true;
      }
    }
  }

  return res.status(200).json({
    version: getAppVersion(),
    commitTag: getCommitTag(),
    updateAvailable,
    commitsBehind,
    restartRequired: restartFlag.isSet(),
  });
});

router.get('/status/appdata', (_req, res) => {
  return res.status(200).json({
    appData: appDataStatus(),
    appDataPath: appDataPath(),
    appDataPermissions: appDataPermissions(),
  });
});

router.use('/user', isAuthenticated(), user);
router.get('/settings/public', async (req, res) => {
  const settings = getSettings();

  if (!(req.user?.settings?.notificationTypes.webpush ?? true)) {
    return res
      .status(200)
      .json({ ...settings.fullPublicSettings, enablePushRegistration: false });
  } else {
    return res.status(200).json(settings.fullPublicSettings);
  }
});
router.get('/settings/discover', isAuthenticated(), async (_req, res) => {
  const sliderRepository = getRepository(DiscoverSlider);

  const sliders = await sliderRepository.find({ order: { order: 'ASC' } });

  return res.json(sliders);
});

router.get(
  '/settings/notifications/pushover/sounds',
  isAuthenticated(),
  async (req, res, next) => {
    const pushoverApi = new PushoverAPI();

    try {
      if (!req.query.token) {
        throw new Error('Pushover application token missing from request');
      }

      const sounds = await pushoverApi.getSounds(req.query.token as string);
      res.status(200).json(sounds);
    } catch (e) {
      logger.debug('Something went wrong retrieving Pushover sounds', {
        label: 'API',
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve Pushover sounds.',
      });
    }
  }
);
// 🧪 ROUTE DE TEST MINIMALISTE - DEBUG ROUTING
router.get('/test-route', (req, res) => {
  logger.info('✅ TEST ROUTE HIT!', { label: 'Test Route' });
  return res.status(200).json({ success: true, message: 'Test route works!' });
});

router.use('/settings', isAuthenticated(Permission.ADMIN), settingsRoutes);
router.use('/search', isAuthenticated(), searchRoutes);
router.use('/discover', isAuthenticated(), discoverRoutes);
router.use('/test', testRoutes); // 🧪 TEST: sans auth pour debug
router.use('/available', availableRoutes); // TEMP: Auth removed for debugging
router.use('/request', isAuthenticated(), requestRoutes);
router.use('/watchlist', isAuthenticated(), watchlistRoutes);
router.use('/blacklist', isAuthenticated(), blacklistRoutes);
router.use('/deletion', isAuthenticated(), deletionRoutes);
router.use('/calendar', isAuthenticated(), calendarRoutes);

router.use('/movie', isAuthenticated(), movieRoutes);
router.use('/tv', isAuthenticated(), tvRoutes);
router.use('/media', isAuthenticated(), mediaRoutes);
router.use('/person', isAuthenticated(), personRoutes);
router.use('/collection', isAuthenticated(), collectionRoutes);
router.use('/service', isAuthenticated(), serviceRoutes);
router.use('/issue', isAuthenticated(), issueRoutes);
router.use('/issueComment', isAuthenticated(), issueCommentRoutes);
router.use('/auth', authRoutes);
router.use(
  '/overrideRule',
  isAuthenticated(Permission.ADMIN),
  overrideRuleRoutes
);

router.get('/regions', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const regions = await tmdb.getRegions();

    return res.status(200).json(regions);
  } catch (e) {
    logger.debug('Something went wrong retrieving regions', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve regions.',
    });
  }
});

router.get('/languages', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const languages = await tmdb.getLanguages();

    return res.status(200).json(languages);
  } catch (e) {
    logger.debug('Something went wrong retrieving languages', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve languages.',
    });
  }
});

router.get<{ id: string }>('/studio/:id', async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const studio = await tmdb.getStudio(Number(req.params.id));

    return res.status(200).json(mapProductionCompany(studio));
  } catch (e) {
    logger.debug('Something went wrong retrieving studio', {
      label: 'API',
      errorMessage: e.message,
      studioId: req.params.id,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve studio.',
    });
  }
});

router.get<{ id: string }>('/network/:id', async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const network = await tmdb.getNetwork(Number(req.params.id));

    return res.status(200).json(mapNetwork(network));
  } catch (e) {
    logger.debug('Something went wrong retrieving network', {
      label: 'API',
      errorMessage: e.message,
      networkId: req.params.id,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve network.',
    });
  }
});

router.get('/genres/movie', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const genres = await tmdb.getMovieGenres({
      language: (req.query.language as string) ?? req.locale,
    });

    return res.status(200).json(genres);
  } catch (e) {
    logger.debug('Something went wrong retrieving movie genres', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve movie genres.',
    });
  }
});

router.get('/genres/tv', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const genres = await tmdb.getTvGenres({
      language: (req.query.language as string) ?? req.locale,
    });

    return res.status(200).json(genres);
  } catch (e) {
    logger.debug('Something went wrong retrieving series genres', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve series genres.',
    });
  }
});

router.get('/backdrops', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage();

  try {
    const data = (
      await tmdb.getAllTrending({
        page: 1,
        timeWindow: 'week',
      })
    ).results.filter((result) => !isPerson(result)) as (
      | TmdbMovieResult
      | TmdbTvResult
    )[];

    return res
      .status(200)
      .json(
        data
          .map((result) => result.backdrop_path)
          .filter((backdropPath) => !!backdropPath)
      );
  } catch (e) {
    logger.debug('Something went wrong retrieving backdrops', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve backdrops.',
    });
  }
});

router.get('/keyword/:keywordId', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage();

  try {
    const result = await tmdb.getKeywordDetails({
      keywordId: Number(req.params.keywordId),
    });

    return res.status(200).json(result);
  } catch (e) {
    logger.debug('Something went wrong retrieving keyword data', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve keyword data.',
    });
  }
});

router.get('/watchproviders/regions', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage();

  try {
    const result = await tmdb.getAvailableWatchProviderRegions({});
    return res.status(200).json(result);
  } catch (e) {
    logger.debug('Something went wrong retrieving watch provider regions', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve watch provider regions.',
    });
  }
});

router.get('/watchproviders/movies', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage();

  try {
    const result = await tmdb.getMovieWatchProviders({
      watchRegion: req.query.watchRegion as string,
    });

    return res.status(200).json(mapWatchProviderDetails(result));
  } catch (e) {
    logger.debug('Something went wrong retrieving movie watch providers', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve movie watch providers.',
    });
  }
});

router.get('/watchproviders/tv', async (req, res, next) => {
  const tmdb = createTmdbWithRegionLanguage();

  try {
    const result = await tmdb.getTvWatchProviders({
      watchRegion: req.query.watchRegion as string,
    });

    return res.status(200).json(mapWatchProviderDetails(result));
  } catch (e) {
    logger.debug('Something went wrong retrieving tv watch providers', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve tv watch providers.',
    });
  }
});

router.get(
  '/certifications/movie',
  isAuthenticated(),
  async (req, res, next) => {
    const tmdb = new TheMovieDb();

    try {
      const certifications = await tmdb.getMovieCertifications();

      return res.status(200).json(certifications);
    } catch (e) {
      logger.error('Something went wrong retrieving movie certifications', {
        label: 'API',
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve movie certifications.',
      });
    }
  }
);

router.get('/certifications/tv', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const certifications = await tmdb.getTvCertifications();

    return res.status(200).json(certifications);
  } catch (e) {
    logger.debug('Something went wrong retrieving TV certifications', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve TV certifications.',
    });
  }
});

router.get('/', (_req, res) => {
  return res.status(200).json({
    api: 'Seerr API',
    version: '1.0',
  });
});

// ═══════════════════════════════════════════════════════════════
// AVAILABLE MEDIA ENDPOINT - DB-only, ultra fast
// ═══════════════════════════════════════════════════════════════

router.get('/available-media', isAuthenticated(), async (req, res, next) => {
  try {
    const mediaRepository = getRepository(Media);

    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const mediaType = (req.query.type as string) || 'movie';
    const sortBy = (req.query.sortBy as string) || 'mediaAddedAt';
    const take = 20;
    const skip = (page - 1) * take;

    logger.debug('Available media request', {
      label: 'Available Media',
      page,
      mediaType,
      sortBy,
    });

    // Build order object
    const orderField =
      sortBy === 'mediaAddedAt'
        ? 'mediaAddedAt'
        : sortBy === 'createdAt'
        ? 'createdAt'
        : 'mediaAddedAt';

    // Query DB - AVAILABLE media only (status = 5)
    const [items, total] = await mediaRepository.findAndCount({
      where: {
        status: 5, // AVAILABLE
        mediaType: mediaType as any,
      },
      order: {
        [orderField]: 'DESC',
      },
      take,
      skip,
    });

    logger.info(`Found ${items.length}/${total} available ${mediaType}`, {
      label: 'Available Media',
      page,
    });

    // Format response - minimal data from Media entity
    const results = items.map((m) => ({
      id: m.tmdbId,
      mediaType: m.mediaType,
      mediaInfo: {
        id: m.id,
        tmdbId: m.tmdbId,
        tvdbId: m.tvdbId,
        status: m.status,
        status4k: m.status4k,
        mediaAddedAt: m.mediaAddedAt,
        downloadStatus: [],
      },
    }));

    // Return paginated response
    return res.status(200).json({
      page,
      totalPages: Math.ceil(total / take),
      totalResults: total,
      results,
    });
  } catch (error) {
    logger.error('Error in /available-media', {
      label: 'Available Media',
      error: (error as Error).message,
    });
    return next({
      status: 500,
      message: 'Failed to load available media',
    });
  }
});

export default router;
