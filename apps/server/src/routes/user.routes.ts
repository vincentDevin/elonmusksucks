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
  getUserActivityStatsHandler,
  uploadProfileImageHandler,
  deleteProfileImageHandler,
  getUserBetsHandler,
  getUserParlaysHandler,
  getUserPredictionsHandler,
  getEnhancedUserStatsHandler,
  getUserAchievementsHandler,
  getRecentAchievementsHandler,
  getAllAchievementsHandler,
  searchUsersHandler,
  getUserFollowersHandler,
  getUserFollowingHandler,
} from '../controllers/user.controller';
import { getUserPosts as getUserPostsHandler } from '../controllers/post.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadConfig, validateFileContent } from '../middleware/fileValidation.middleware';
import { getUserPongStats, getUserPongHistory } from '../controllers/pong.controller';

const router = Router();

// IMPORTANT: All /me routes MUST come first before any /:userId routes
router.get('/me/pong-stats', requireAuth, getUserPongStats);

// User search for mentions - MUST come before /:userId routes
router.get('/search', searchUsersHandler);

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

// Delete profile picture (revert to default)
router.delete('/:userId/profile-picture', requireAuth, deleteProfileImageHandler);

// User feed endpoints (legacy - will be deprecated)
router.get('/:userId/feed', requireAuth, getUserFeedHandler);
router.post('/:userId/feed', requireAuth, createUserPostHandler);

// User posts endpoints (new)
router.get('/:userId/posts', getUserPostsHandler);

// User activity log
router.get('/:userId/activity', requireAuth, getUserActivityHandler);

// Follow/unfollow
router.post('/:userId/follow', requireAuth, followUserHandler);
router.delete('/:userId/follow', requireAuth, unfollowUserHandler);

// Get followers/following lists
router.get('/:userId/followers', getUserFollowersHandler);
router.get('/:userId/following', getUserFollowingHandler);

// User stats
router.get('/:userId/stats', requireAuth, getUserStatsHandler);
router.get('/:userId/activity-stats', requireAuth, getUserActivityStatsHandler);
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
