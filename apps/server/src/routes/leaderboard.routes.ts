// apps/server/src/routes/leaderboard.routes.ts

import { Router } from 'express';
import { getTopAllTime, getTopDaily } from '../controllers/leaderboard.controller';

const router = Router();

// Public leaderboard endpoints
// GET /api/leaderboard/all-time?limit=25
router.get('/all-time', getTopAllTime);

// GET /api/leaderboard/daily?limit=25
router.get('/daily', getTopDaily);

// (Future) weekly/monthly endpoints could be added here:
// router.get('/weekly', getTopWeekly);
// router.get('/monthly', getTopMonthly);

export default router;
