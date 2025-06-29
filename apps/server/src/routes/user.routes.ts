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
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile/:userId', requireAuth, getProfile);
router.put('/:userId', requireAuth, updateProfileHandler);

router.get('/:userId/feed', requireAuth, getUserFeedHandler);
router.post('/:userId/feed', requireAuth, createUserPostHandler);

router.get('/:userId/activity', requireAuth, getUserActivityHandler);

router.post('/:userId/follow', requireAuth, followUserHandler);
router.delete('/:userId/follow', requireAuth, unfollowUserHandler);

router.get('/:userId/stats', requireAuth, getUserStatsHandler);

export default router;
