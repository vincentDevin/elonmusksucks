// apps/server/src/routes/auth.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rateLimiter';
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

const router = Router();

// Public routes with rate limiting
router.post('/register', apiLimiter, registerUser);
router.post('/login', apiLimiter, loginUser);
router.post('/refresh', apiLimiter, refreshToken);
router.get('/verify-email', apiLimiter, verifyEmail);

// Protected routes
router.post('/logout', requireAuth, logoutUser);
router.get('/me', requireAuth, me);

// Password reset flows (also rate-limited)
router.post('/request-password-reset', apiLimiter, requestPasswordReset);
router.post('/reset-password', apiLimiter, performPasswordReset);

export default router;
