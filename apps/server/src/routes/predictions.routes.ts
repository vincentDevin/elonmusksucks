import { Router } from 'express';
import {
  getAllPredictions,
  getPredictionById,
  createPrediction,
  getCategories,
  getSourceLinks,
  createPredictionSourceLink,
  getFilteredPredictions,
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
  removeReaction,
  getPredictionComments as getPredictionCommentsController,
  createPredictionComment as createPredictionCommentController,
} from '../controllers/predictions.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAllPredictions);
router.get('/categories', getCategories); // MUST be before /:id routes
router.get('/:id', getPredictionById);

// Authenticated routes
router.post('/', requireAuth, createPrediction);

// POST /api/predictions/source-links - Link article to prediction
router.post('/source-links', requireAuth, createPredictionSourceLink);

// GET /api/predictions/:id/source-links - Get source links for a prediction
router.get('/:id/source-links', getSourceLinks);

// POST /api/predictions/filter - Get filtered and sorted predictions with analytics support
router.post('/filter', getFilteredPredictions);

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
