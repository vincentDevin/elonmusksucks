// apps/server/src/routes/user.routes.ts
import { Router } from 'express';
import multer from 'multer';
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
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';

// Configure Multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Fetch a user's public profile
router.get('/profile/:userId', requireAuth, getProfile);

// Update profile fields
router.put('/:userId', requireAuth, updateProfileHandler);

// Upload profile picture
router.post(
  '/:userId/profile-picture',
  requireAuth,
  upload.single('image'),
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

export default router;
