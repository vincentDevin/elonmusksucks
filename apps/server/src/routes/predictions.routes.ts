import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
} from '../controllers/predictions.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllPredictions);
router.get('/:id', getPredictionById);

// Authenticated routes
router.post('/', requireAuth, createPrediction);

export default router;
