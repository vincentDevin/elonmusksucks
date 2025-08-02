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
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadConfig, validateFileContent } from '../middleware/fileValidation.middleware';

const router = Router();

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

// User activity data for dashboard
router.get('/:userId/bets', requireAuth, getUserBetsHandler);
router.get('/:userId/parlays', requireAuth, getUserParlaysHandler);
router.get('/:userId/predictions', requireAuth, getUserPredictionsHandler);

export default router;
