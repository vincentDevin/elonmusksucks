// apps/server/src/routes/leaderboard.routes.ts
import { Router } from 'express';
import {
  getTopAllTime,
  getTopDaily,
  refreshLeaderboard,
} from '../controllers/leaderboard.controller';

const router = Router();

// Public leaderboard endpoints
router.get('/all-time', getTopAllTime);
router.get('/daily', getTopDaily);

// Admin or on-demand refresh endpoint
router.post('/refresh', refreshLeaderboard);

export default router;
