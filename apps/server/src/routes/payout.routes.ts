import { Router } from 'express';
import { PayoutController } from '../controllers/payout.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Resolve a prediction and payout winners
// Expects param :id and body: { winningOptionId: number }
router.post('/predictions/:id/resolve', requireAuth, PayoutController.resolvePrediction);

export default router;
