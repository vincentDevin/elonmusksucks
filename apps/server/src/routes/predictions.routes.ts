import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
  resolvePredictionHandler,
  getLeaderboard,
} from '../controllers/predictions.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllPredictions);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getPredictionById);

// Authenticated routes
router.post('/', requireAuth, createPrediction);
router.post('/:id/resolve', requireAuth, requireAdmin, resolvePredictionHandler);

export default router;
