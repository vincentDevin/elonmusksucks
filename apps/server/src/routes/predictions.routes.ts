import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
  getCategories,
  getSourceLinks,
  getActivityLevel,
  getBulkActivityLevels,
  getActivityMetrics,
  getDifficulty,
  getBulkDifficulties,
  getFilteredPredictions,
  getViewStats,
  getBulkViewStats,
  trackView,
  getPredictionAnalytics,
  getDetailedAnalytics,
  getCategoryAnalytics,
  getPerformanceMetrics,
  getHotMarkets,
  getMarketTrends,
  getPersonalizedRecommendations,
  getSimilarPredictions,
  toggleReaction,
  getPredictionReactions,
  removeReaction,
  getReactionCounts,
  getPredictionComments as getPredictionCommentsController,
  createPredictionComment as createPredictionCommentController,
} from '../controllers/predictions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import type { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllPredictions);
router.get('/categories', getCategories); // MUST be before /:id routes
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

// GET /api/predictions/:id/activity-level - Get activity level for a single prediction
router.get('/:id/activity-level', getActivityLevel);

// POST /api/predictions/activity-levels - Get activity levels for multiple predictions
router.post('/activity-levels', getBulkActivityLevels);

// GET /api/predictions/:id/activity-metrics - Get comprehensive activity metrics for a prediction
router.get('/:id/activity-metrics', getActivityMetrics);

// GET /api/predictions/:id/difficulty - Get difficulty level for a single prediction
router.get('/:id/difficulty', getDifficulty);

// POST /api/predictions/difficulties - Get difficulty levels for multiple predictions
router.post('/difficulties', getBulkDifficulties);

// POST /api/predictions/filter - Get filtered and sorted predictions with analytics support
router.post('/filter', getFilteredPredictions);

// GET /api/predictions/:id/view-stats - Get view analytics for a single prediction
router.get('/:id/view-stats', getViewStats);

// POST /api/predictions/view-stats - Get view analytics for multiple predictions
router.post('/view-stats', getBulkViewStats);

// POST /api/predictions/:id/track-view - Track a user viewing a prediction (manual endpoint)
router.post('/:id/track-view', trackView);

// GET /api/predictions/analytics - Get general prediction analytics
router.get('/analytics', getPredictionAnalytics);

// GET /api/predictions/analytics/categories - Get analytics breakdown by category
router.get('/analytics/categories', getCategoryAnalytics);

// GET /api/predictions/analytics/performance - Get performance metrics and trends
router.get('/analytics/performance', getPerformanceMetrics);

// GET /api/predictions/:id/analytics - Get detailed analytics for a specific prediction
router.get('/:id/analytics', getDetailedAnalytics);

// GET /api/predictions/hot-markets - Detect currently hot prediction markets
router.get('/hot-markets', getHotMarkets);

// GET /api/predictions/market-trends - Get trending, emerging, and cooling markets
router.get('/market-trends', getMarketTrends);

// POST /api/predictions/recommendations - Get personalized recommendations for a user
router.post('/recommendations', getPersonalizedRecommendations);

// GET /api/predictions/:id/similar - Get similar predictions based on content and user behavior
router.get('/:id/similar', getSimilarPredictions);

// ===============================================
// Prediction Reactions
// ===============================================
// GET /api/predictions/:id/reactions - Get reactions for a prediction
router.get('/:id/reactions', getPredictionReactions);

// GET /api/predictions/:id/reactions/counts - Get reaction counts (public)
router.get('/:id/reactions/counts', getReactionCounts);

// POST /api/predictions/:id/reactions - Toggle a reaction on a prediction
router.post('/:id/reactions', requireAuth, toggleReaction);

// DELETE /api/predictions/:id/reactions/:type - Remove a specific reaction
router.delete('/:id/reactions/:type', requireAuth, removeReaction);

// ===============================================
// Prediction Comments (unified Content system)
// ===============================================
// Note: Comments are now handled by the unified Content system
// These routes use post.controller handlers which work with ContentRepository

// GET /api/predictions/:id/comments - Get comments for a prediction
router.get('/:id/comments', getPredictionCommentsController);

// POST /api/predictions/:id/comments - Create a comment on a prediction
router.post('/:id/comments', requireAuth, createPredictionCommentController);

export default router;
