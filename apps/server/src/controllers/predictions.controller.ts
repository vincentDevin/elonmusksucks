// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/predictions.service';
import { categoryService } from '../services/category.service';
import {
  PredictionType,
  CreatePredictionPayload,
  InputSizeLimits,
  PredictionView,
} from '@ems/types';
import { toPredictionView } from '../view/prediction.view';

/**
 * GET /api/predictions
 * List all predictions, each including:
 *   - options[]
 *   - bets[] (single bets with user info)
 *   - parlayLegs[] (all parlay legs with user & stake)
 */
export const getAllPredictions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const all = await predictionService.listAllPredictions();

    const payload = all.map(toPredictionView) satisfies PredictionView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id
 * Fetch one prediction by ID, including its options, bets, and parlay legs.
 */
export const getPredictionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const prediction = await predictionService.getPrediction(id);
    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    const payload = toPredictionView(prediction) satisfies PredictionView;
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions
 * Create a new prediction with dynamic options or auto-generated for BINARY / OVER_UNDER
 */
export const createPrediction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, categoryId, expiresAt, options, type, threshold } =
      req.body as CreatePredictionPayload;

    const creatorId = (req as any).user?.id;
    if (!creatorId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Input size validation
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Prediction title is required' });
      return;
    }
    if (title.length > InputSizeLimits.PredictionTitle) {
      console.warn(
        `[input-caps] Prediction title rejected: ${title.length} chars (limit: ${InputSizeLimits.PredictionTitle})`,
      );
      res.status(413).json({
        error: 'Prediction title too long',
        limit: InputSizeLimits.PredictionTitle,
        actual: title.length,
      });
      return;
    }

    if (
      description &&
      typeof description === 'string' &&
      description.length > InputSizeLimits.PredictionDescription
    ) {
      console.warn(
        `[input-caps] Prediction description rejected: ${description.length} chars (limit: ${InputSizeLimits.PredictionDescription})`,
      );
      res.status(413).json({
        error: 'Prediction description too long',
        limit: InputSizeLimits.PredictionDescription,
        actual: description.length,
      });
      return;
    }

    // Validate option text lengths
    if (Array.isArray(options)) {
      for (const option of options) {
        if (
          option.label &&
          typeof option.label === 'string' &&
          option.label.length > InputSizeLimits.PredictionOptionText
        ) {
          console.warn(
            `[input-caps] Prediction option rejected: ${option.label.length} chars (limit: ${InputSizeLimits.PredictionOptionText})`,
          );
          res.status(413).json({
            error: 'Prediction option text too long',
            limit: InputSizeLimits.PredictionOptionText,
            actual: option.label.length,
          });
          return;
        }
      }
    }

    // Determine final options
    let finalOptions: Array<{ label: string }> = [];
    if (type === PredictionType.BINARY) {
      finalOptions = [{ label: 'Yes' }, { label: 'No' }];
    } else if (type === PredictionType.OVER_UNDER) {
      if (threshold == null) {
        res.status(400).json({ error: 'threshold required for over/under' });
        return;
      }
      finalOptions = [{ label: `Over ${threshold}` }, { label: `Under ${threshold}` }];
    } else {
      finalOptions = options ?? [];
    }

    const pred = await predictionService.createPrediction({
      title,
      description,
      categoryId,
      expiresAt: new Date(expiresAt),
      creatorId,
      options: finalOptions,
      type,
      threshold,
    });

    res.status(201).json(pred);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/categories
 * Get all active categories for prediction creation
 */
export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await categoryService.getActiveCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/source-links
 * Get source links for a prediction
 */
export const getSourceLinks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const sourceLinks = await predictionService.getSourceLinks(predictionId);
    res.json(sourceLinks);
  } catch (err) {
    next(err);
  }
};

export const findPredictionById = async (id: number) => {
  return predictionService.findPredictionBasicById(id);
};

export const findExistingSourceLink = async (
  predictionId: number,
  articleId?: number,
  tweetId?: string,
) => {
  return predictionService.findExistingSourceLink(predictionId, articleId, tweetId);
};

export const createSourceLink = async (
  predictionId: number,
  articleId: number | null,
  tweetId: string | null,
  url: string,
  title: string | null,
  publisher: string | null,
) => {
  return predictionService.createSourceLink(
    predictionId,
    articleId || null,
    tweetId || null,
    url,
    title || null,
    publisher || null,
  );
};

/**
 * GET /api/predictions/:id/activity-level
 * Get activity level for a single prediction
 */
export const getActivityLevel = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const activityLevel = await predictionService.calculateActivityLevel(predictionId);
    res.json({ predictionId, activityLevel });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/activity-levels
 * Get activity levels for multiple predictions
 * Body: { predictionIds: number[] }
 */
export const getBulkActivityLevels = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { predictionIds } = req.body;

    if (!Array.isArray(predictionIds) || predictionIds.some((id) => typeof id !== 'number')) {
      res.status(400).json({ error: 'predictionIds must be an array of numbers' });
      return;
    }

    if (predictionIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 predictions per request' });
      return;
    }

    const activityLevels = await predictionService.calculateBulkActivityLevels(predictionIds);
    res.json({ activityLevels });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/activity-metrics
 * Get comprehensive activity metrics for a prediction
 */
export const getActivityMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const metrics = await predictionService.getActivityMetrics(predictionId);
    res.json({ predictionId, ...metrics });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/difficulty
 * Get difficulty level for a single prediction
 */
export const getDifficulty = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const difficulty = await predictionService.calculateDifficulty(predictionId);
    res.json({ predictionId, difficulty });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/difficulties
 * Get difficulty levels for multiple predictions
 * Body: { predictionIds: number[] }
 */
export const getBulkDifficulties = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { predictionIds } = req.body;

    if (!Array.isArray(predictionIds) || predictionIds.some((id) => typeof id !== 'number')) {
      res.status(400).json({ error: 'predictionIds must be an array of numbers' });
      return;
    }

    if (predictionIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 predictions per request' });
      return;
    }

    const difficulties = await predictionService.calculateBulkDifficulties(predictionIds);
    res.json({ difficulties });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/filter
 * Get filtered and sorted predictions with analytics support
 * Body: PredictionFilter object with optional pagination
 */
export const getFilteredPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = req.body;

    // Validate pagination parameters
    if (
      filters.limit &&
      (typeof filters.limit !== 'number' || filters.limit < 1 || filters.limit > 100)
    ) {
      res.status(400).json({ error: 'limit must be a number between 1 and 100' });
      return;
    }

    if (filters.offset && (typeof filters.offset !== 'number' || filters.offset < 0)) {
      res.status(400).json({ error: 'offset must be a non-negative number' });
      return;
    }

    // Validate filter arrays
    if (filters.categories && !Array.isArray(filters.categories)) {
      res.status(400).json({ error: 'categories must be an array' });
      return;
    }

    if (filters.difficulties && !Array.isArray(filters.difficulties)) {
      res.status(400).json({ error: 'difficulties must be an array' });
      return;
    }

    const result = await predictionService.getFilteredPredictions(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/view-stats
 * Get view analytics for a single prediction
 */
export const getViewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const stats = await predictionService.getPredictionViewStats(predictionId);
    res.json({ predictionId, ...stats });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/view-stats
 * Get view analytics for multiple predictions
 * Body: { predictionIds: number[] }
 */
export const getBulkViewStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { predictionIds } = req.body;

    if (!Array.isArray(predictionIds) || predictionIds.some((id) => typeof id !== 'number')) {
      res.status(400).json({ error: 'predictionIds must be an array of numbers' });
      return;
    }

    if (predictionIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 predictions per request' });
      return;
    }

    const stats = await predictionService.getBulkViewStats(predictionIds);
    res.json({ viewStats: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/:id/track-view
 * Track a user viewing a prediction (manual endpoint for testing/debugging)
 */
export const trackView = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);
    const { userId } = req.body;

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    if (!userId || typeof userId !== 'number') {
      res.status(400).json({ error: 'userId is required and must be a number' });
      return;
    }

    await predictionService.trackPredictionView(predictionId, userId);
    res.json({ success: true, message: 'View tracked successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/analytics
 * Get general prediction analytics (status counts, resolution times)
 */
export const getPredictionAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const analytics = await predictionService.getPredictionAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/analytics
 * Get detailed analytics for a specific prediction
 */
export const getDetailedAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const analytics = await predictionService.getDetailedPredictionAnalytics(predictionId);
    res.json({ predictionId, ...analytics });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/analytics/categories
 * Get analytics breakdown by category
 */
export const getCategoryAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const analytics = await predictionService.getCategoryAnalytics();
    res.json({ categories: analytics });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/analytics/performance
 * Get performance metrics including distributions and trends
 */
export const getPerformanceMetrics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const metrics = await predictionService.getPerformanceMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/hot-markets
 * Detect currently hot prediction markets based on activity and engagement
 */
export const getHotMarkets = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const hotMarkets = await predictionService.detectHotMarkets();
    res.json({ hotMarkets });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/market-trends
 * Get trending, emerging, and cooling markets analysis
 */
export const getMarketTrends = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const trends = await predictionService.getMarketTrends();
    res.json(trends);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/recommendations
 * Get personalized prediction recommendations for a user
 * Body: { userId: number, options?: RecommendationOptions }
 */
export const getPersonalizedRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, options = {} } = req.body;

    if (!userId || typeof userId !== 'number') {
      res.status(400).json({ error: 'userId is required and must be a number' });
      return;
    }

    const recommendations = await predictionService.getPersonalizedRecommendations(userId, options);
    res.json({ userId, recommendations });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/similar
 * Get predictions similar to the specified prediction
 */
export const getSimilarPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 5;

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    if (limit < 1 || limit > 20) {
      res.status(400).json({ error: 'limit must be between 1 and 20' });
      return;
    }

    const similarPredictions = await predictionService.getSimilarPredictions(predictionId, limit);
    res.json({ predictionId, similarPredictions });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id/comments
 * Get comments for a specific prediction
 */
export const getPredictionComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const result = await predictionService.getPredictionComments(
      predictionId,
      limit,
      cursor?.toString(),
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/:id/comments
 * Create a comment on a prediction
 */
export const createPredictionComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ error: 'Comment content too long (max 1000 characters)' });
      return;
    }

    const comment = await predictionService.createPredictionComment(
      predictionId,
      userId,
      content.trim(),
    );
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};
