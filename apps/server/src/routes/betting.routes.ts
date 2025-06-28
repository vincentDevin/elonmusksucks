// apps/server/src/routes/betting.routes.ts
import { Router } from 'express';
import { placeBetHandler, placeParlayHandler } from '../controllers/betting.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Place a single bet
// Expects body: { optionId: number; amount: number }
router.post('/bet', requireAuth, placeBetHandler);

// Place a parlay (multi-leg bet)
// Expects body: { legs: { optionId: number }[]; amount: number }
router.post('/parlay', requireAuth, placeParlayHandler);

export default router;
