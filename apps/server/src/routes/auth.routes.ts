import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  me,
  verifyEmail,
  requestPasswordReset,
  performPasswordReset,
} from '../controllers/auth.controller';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/register', apiLimiter, registerUser);
router.post('/login', apiLimiter, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.get('/me', requireAuth, me);
router.post('/request-password-reset', apiLimiter, requestPasswordReset);
router.post('/reset-password', apiLimiter, performPasswordReset);
router.get('/verify-email', apiLimiter, verifyEmail);

export default router;
