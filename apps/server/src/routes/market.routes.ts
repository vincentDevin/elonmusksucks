import { Router } from 'express';
import {
  getMarketOverview,
  getMarketHealth,
  getTrendingPredictions,
} from '../controllers/market.controller';

const router = Router();

router.get('/overview', getMarketOverview);
router.get('/health', getMarketHealth);
router.get('/trending', getTrendingPredictions);

export default router;
