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
import { getEloLeaderboard, getLeaderboardByMetric } from '../controllers/pong.controller';

const router = Router();

// Root endpoint - defaults to all-time leaderboard
router.get('/', getTopAllTime);

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

// ============================================
// PONG LEADERBOARD ENDPOINTS
// ============================================

// GET /api/leaderboard/pong/elo - Hybrid Elo rankings
router.get('/pong/elo', getEloLeaderboard);

// GET /api/leaderboard/pong/:metric - Other Pong rankings
router.get('/pong/:metric', getLeaderboardByMetric);

export default router;
