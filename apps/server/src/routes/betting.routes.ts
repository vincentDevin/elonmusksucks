import { Router } from 'express';
import { BettingController } from '../controllers/betting.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Place a single bet
// Expects body: { optionId: number; amount: number }
router.post('/bet', requireAuth, BettingController.placeBet);

// Place a parlay (multi-leg bet)
// Expects body: { legs: { optionId: number }[]; amount: number }
router.post('/parlay', requireAuth, BettingController.placeParlay);

export default router;
