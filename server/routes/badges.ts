import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import { UserBadge } from '@server/entity/UserBadge';
import badgeService, { BADGE_DEFINITIONS } from '@server/lib/badgeService';
import { Permission } from '@server/lib/permissions';
import logger from '@server/logger';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/badges/all
 * Get all available badges with their definitions
 */
router.get('/all', isAuthenticated(), async (_req, res, next) => {
  try {
    const badges = Object.values(BADGE_DEFINITIONS);

    return res.status(200).json({
      badges,
      total: badges.length,
    });
  } catch (e) {
    logger.error('Failed to fetch all badges', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Failed to fetch badges.',
    });
  }
});

/**
 * GET /api/v1/badges/user/:userId
 * Get all badges earned by a specific user
 */
router.get<{ userId: string }>(
  '/user/:userId',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      // Verify user exists
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return next({
          status: 404,
          message: 'User not found.',
        });
      }

      // Get user badges with definitions
      const badges = await badgeService.getUserBadges(userId);

      return res.status(200).json({
        userId,
        badges,
        total: badges.length,
      });
    } catch (e) {
      logger.error('Failed to fetch user badges', {
        label: 'API',
        userId: req.params.userId,
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Failed to fetch user badges.',
      });
    }
  }
);

/**
 * GET /api/v1/badges/user/:userId/progress
 * Get badge progress for a specific user
 */
router.get<{ userId: string }>(
  '/user/:userId/progress',
  isAuthenticated(),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      // Only allow users to view their own progress or admins to view any
      if (
        userId !== req.user?.id &&
        !req.user?.hasPermission(Permission.ADMIN)
      ) {
        return next({
          status: 403,
          message: 'You do not have permission to view this user\'s progress.',
        });
      }

      // Verify user exists
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return next({
          status: 404,
          message: 'User not found.',
        });
      }

      // Get badge progress
      const progress = await badgeService.getBadgeProgress(userId);

      return res.status(200).json({
        userId,
        progress,
      });
    } catch (e) {
      logger.error('Failed to fetch badge progress', {
        label: 'API',
        userId: req.params.userId,
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Failed to fetch badge progress.',
      });
    }
  }
);

/**
 * POST /api/v1/badges/user/:userId/award/:badgeType
 * Manually award a community badge to a user (admin only)
 */
router.post<{ userId: string; badgeType: string }>(
  '/user/:userId/award/:badgeType',
  isAuthenticated(Permission.ADMIN),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const { badgeType } = req.params;

      // Verify user exists
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return next({
          status: 404,
          message: 'User not found.',
        });
      }

      // Award the badge
      const badge = await badgeService.awardCommunityBadge(
        userId,
        badgeType,
        req.user?.id
      );

      if (!badge) {
        return next({
          status: 400,
          message: 'Badge already awarded or invalid badge type.',
        });
      }

      logger.info('Community badge awarded', {
        label: 'Badges',
        userId,
        badgeType,
        awardedBy: req.user?.id,
      });

      return res.status(201).json({
        badge: {
          ...badge,
          definition: BADGE_DEFINITIONS[badge.badgeType],
        },
      });
    } catch (e) {
      logger.error('Failed to award community badge', {
        label: 'API',
        userId: req.params.userId,
        badgeType: req.params.badgeType,
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Failed to award badge.',
      });
    }
  }
);

/**
 * POST /api/v1/badges/user/:userId/check
 * Manually trigger badge check for a user (admin only)
 */
router.post<{ userId: string }>(
  '/user/:userId/check',
  isAuthenticated(Permission.ADMIN),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      // Verify user exists
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return next({
          status: 404,
          message: 'User not found.',
        });
      }

      // Check and award badges
      const newBadges = await badgeService.checkAndAwardBadges(userId);

      logger.info('Badge check completed', {
        label: 'Badges',
        userId,
        newBadgesCount: newBadges.length,
      });

      return res.status(200).json({
        userId,
        newBadges: newBadges.map((badge) => ({
          ...badge,
          definition: BADGE_DEFINITIONS[badge.badgeType],
        })),
        count: newBadges.length,
      });
    } catch (e) {
      logger.error('Failed to check badges', {
        label: 'API',
        userId: req.params.userId,
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Failed to check badges.',
      });
    }
  }
);

/**
 * DELETE /api/v1/badges/user/:userId/badge/:badgeId
 * Remove a badge from a user (admin only)
 */
router.delete<{ userId: string; badgeId: string }>(
  '/user/:userId/badge/:badgeId',
  isAuthenticated(Permission.ADMIN),
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const badgeId = Number(req.params.badgeId);

      const badgeRepository = getRepository(UserBadge);
      const badge = await badgeRepository.findOne({
        where: {
          id: badgeId,
          userId,
        },
      });

      if (!badge) {
        return next({
          status: 404,
          message: 'Badge not found.',
        });
      }

      await badgeRepository.remove(badge);

      logger.info('Badge removed', {
        label: 'Badges',
        userId,
        badgeId,
        badgeType: badge.badgeType,
        removedBy: req.user?.id,
      });

      return res.status(204).send();
    } catch (e) {
      logger.error('Failed to remove badge', {
        label: 'API',
        userId: req.params.userId,
        badgeId: req.params.badgeId,
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Failed to remove badge.',
      });
    }
  }
);

export default router;
