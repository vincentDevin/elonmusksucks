// apps/server/src/routes/auth.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  me,
} from '../controllers/auth.controller';

const router = Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.get('/me', requireAuth, me);

export default router;
