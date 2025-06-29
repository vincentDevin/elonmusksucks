import { Router } from 'express';
import { resolvePredictionHandler } from '../controllers/payout.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Admin: resolve a prediction and payout winners
// Expects param :id and body { winningOptionId: number }
router.post('/predictions/:id/resolve', requireAuth, requireAdmin, resolvePredictionHandler);

export default router;
