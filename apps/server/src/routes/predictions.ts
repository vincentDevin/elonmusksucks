import express from 'express';
import { getAllPredictions, createPrediction } from '../controllers/predictionController';

const router = express.Router();

router.get('/', getAllPredictions);
router.post('/', createPrediction);

export default router;
