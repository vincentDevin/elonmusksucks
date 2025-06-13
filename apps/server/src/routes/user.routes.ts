import { Router } from 'express';
import {
  getProfile,
  followUserHandler,
  unfollowUserHandler,
  updateProfileHandler,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile/:userId', requireAuth, getProfile);
router.post('/:userId/follow', requireAuth, followUserHandler);
router.delete('/:userId/follow', requireAuth, unfollowUserHandler);
router.put('/:userId', requireAuth, updateProfileHandler);

export default router;
