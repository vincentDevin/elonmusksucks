// apps/server/src/routes/leaderboard.routes.ts
import { Router } from 'express';
import {
  getTopAllTime,
  getTopDaily,
  getTopAllTimePaginated,
  getTopDailyPaginated,
  getUserRank,
  getLeaderboardStats,
  refreshLeaderboard,
} from '../controllers/leaderboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public leaderboard endpoints (legacy)
router.get('/all-time', getTopAllTime);
router.get('/daily', getTopDaily);

// Enhanced paginated endpoints
router.get('/all-time/paginated', getTopAllTimePaginated);
router.get('/daily/paginated', getTopDailyPaginated);

// User-specific endpoints (require auth)
router.get('/user/:userId/rank', requireAuth, getUserRank);

// Statistics endpoint
router.get('/stats', getLeaderboardStats);

// Admin or on-demand refresh endpoint
router.post('/refresh', refreshLeaderboard);

export default router;
