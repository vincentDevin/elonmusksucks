import { Router } from 'express';
import { getProfile, followUserHandler, unfollowUserHandler } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile/:userId', requireAuth, getProfile);
router.post('/users/:userId/follow', requireAuth, followUserHandler);
router.delete('/users/:userId/follow', requireAuth, unfollowUserHandler);

export default router;
