// apps/server/src/routes/user.routes.ts
import { Router } from 'express';
import {
  getProfile,
  followUserHandler,
  unfollowUserHandler,
  updateProfileHandler,
  getUserFeedHandler,
  createUserPostHandler,
  getUserActivityHandler,
  getUserStatsHandler,
  uploadProfileImageHandler,
  getUserBetsHandler,
  getUserParlaysHandler,
  getUserPredictionsHandler,
  getEnhancedUserStatsHandler,
  getUserAchievementsHandler,
  getRecentAchievementsHandler,
  getAllAchievementsHandler,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadConfig, validateFileContent } from '../middleware/fileValidation.middleware';
import { getUserPongStats, getUserPongHistory } from '../controllers/pong.controller';

const router = Router();

// IMPORTANT: All /me routes MUST come first before any /:userId routes
router.get('/me/pong-stats', requireAuth, getUserPongStats);

// Fetch a user's public profile
router.get('/profile/:userId', requireAuth, getProfile);

// Update profile fields
router.put('/:userId', requireAuth, updateProfileHandler);

// Upload profile picture with enhanced validation
router.post(
  '/:userId/profile-picture',
  requireAuth,
  uploadConfig.single('image'),
  validateFileContent,
  uploadProfileImageHandler,
);

// User feed endpoints
router.get('/:userId/feed', requireAuth, getUserFeedHandler);
router.post('/:userId/feed', requireAuth, createUserPostHandler);

// User activity log
router.get('/:userId/activity', requireAuth, getUserActivityHandler);

// Follow/unfollow
router.post('/:userId/follow', requireAuth, followUserHandler);
router.delete('/:userId/follow', requireAuth, unfollowUserHandler);

// User stats
router.get('/:userId/stats', requireAuth, getUserStatsHandler);
router.get('/:userId/enhanced-stats', requireAuth, getEnhancedUserStatsHandler);
router.get('/:userId/achievements', requireAuth, getUserAchievementsHandler);
router.get('/:userId/achievements/recent', requireAuth, getRecentAchievementsHandler);
router.get('/achievements/all', requireAuth, getAllAchievementsHandler);

// User activity data for dashboard
router.get('/:userId/bets', requireAuth, getUserBetsHandler);
router.get('/:userId/parlays', requireAuth, getUserParlaysHandler);
router.get('/:userId/predictions', requireAuth, getUserPredictionsHandler);

// More Pong-specific user endpoints
router.get('/:userId/pong-stats', requireAuth, getUserPongStats);
router.get('/:userId/pong-history', requireAuth, getUserPongHistory);

export default router;
