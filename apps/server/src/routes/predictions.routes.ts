import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
  getSourceLinks,
} from '../controllers/predictions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import type { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllPredictions);
router.get('/:id', getPredictionById);

// Authenticated routes
router.post('/', requireAuth, createPrediction);

// POST /api/predictions/source-links - Link article to prediction
router.post('/source-links', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const { predictionId, articleId, tweetId, url, title, publisher } = req.body;
    // const userId = req.user!.id; // Not currently used, but available for future permissions

    // Validate required fields
    if (!predictionId || !url) {
      res.status(400).json({ error: 'Prediction ID and URL are required' });
      return;
    }

    if (!articleId && !tweetId) {
      res.status(400).json({ error: 'Either article ID or tweet ID is required' });
      return;
    }

    // Check if prediction exists and user has permission to link sources
    const { findPredictionById } = require('../controllers/predictions.controller');
    const prediction = await findPredictionById(predictionId);

    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    if (prediction.resolved) {
      res.status(400).json({ error: 'Cannot link sources to resolved predictions' });
      return;
    }

    // For now, allow any authenticated user to link sources
    // Later we might restrict to prediction creator or admins

    // Check if this link already exists
    const { findExistingSourceLink } = require('../controllers/predictions.controller');
    const existingLink = await findExistingSourceLink(predictionId, articleId, tweetId);

    if (existingLink) {
      res.status(409).json({ error: 'This source is already linked to this prediction' });
      return;
    }

    // Create the source link
    const { createSourceLink } = require('../controllers/predictions.controller');
    const sourceLink = await createSourceLink(
      predictionId,
      articleId,
      tweetId,
      url,
      title,
      publisher,
    );

    res.status(201).json({
      id: sourceLink.id,
      predictionId: sourceLink.predictionId,
      articleId: sourceLink.articleId,
      tweetId: sourceLink.tweetId,
      url: sourceLink.url,
      title: sourceLink.title,
      publisher: sourceLink.publisher,
      capturedAt: sourceLink.capturedAt.toISOString(),
      source: sourceLink.article || sourceLink.tweet || null,
    });
  } catch (error) {
    console.error('[predictions] Error creating source link:', error);
    res.status(500).json({ error: 'Failed to create source link' });
  }
});

// GET /api/predictions/:id/source-links - Get source links for a prediction
router.get('/:id/source-links', getSourceLinks);

export default router;
