// apps/server/src/routes/auth.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  accountLockoutMiddleware,
} from '../middleware/rateLimiter';
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  me,
  verifyEmail,
  requestPasswordReset,
  performPasswordReset,
  updateTheme,
} from '../controllers/auth.controller';

const router = Router();

// Public routes with specialized rate limiting
router.post('/register', authLimiter, registerUser);
router.post('/login', accountLockoutMiddleware, authLimiter, loginUser);
router.post('/refresh', apiLimiter, refreshToken);
router.get('/verify-email', apiLimiter, verifyEmail);

// Protected routes
router.post('/logout', requireAuth, logoutUser);
router.get('/me', requireAuth, me);
router.put('/theme', requireAuth, updateTheme);

// Password reset flows (with aggressive rate limiting)
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, performPasswordReset);

export default router;
