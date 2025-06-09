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

const router = Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.get('/me', requireAuth, me);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', performPasswordReset);
router.get('/verify-email', verifyEmail);

export default router;
