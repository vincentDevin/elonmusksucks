import { Router } from 'express';
import { placeBetHandler, placeParlayHandler } from '../controllers/betting.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Place a single bet
router.post('/bet', requireAuth, placeBetHandler);

// Place a parlay (multi-leg bet)
router.post('/parlay', requireAuth, placeParlayHandler);

export default router;
