import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
  placeBet,
  resolvePrediction,
  getLeaderboard,
} from '../controllers/predictions.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public
router.get('/', getAllPredictions);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getPredictionById);

// Authenticated
router.post('/', requireAuth, createPrediction);
router.post('/:id/bet', requireAuth, placeBet);
router.post('/:id/resolve', requireAuth, requireAdmin, resolvePrediction);

export default router;
