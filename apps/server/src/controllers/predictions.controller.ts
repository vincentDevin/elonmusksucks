// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/predictions.service';
import { UserService } from '../services/user.service';
import {
  PredictionType,
  CreatePredictionPayload,
  InputSizeLimits,
  PredictionView,
} from '@ems/types';
import { toPredictionView } from '../view/prediction.view';

const userService = new UserService();

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
    const { title, description, category, expiresAt, options, type, threshold } =
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
      category,
      expiresAt: new Date(expiresAt),
      creatorId,
      options: finalOptions,
      type,
      threshold,
    });

    await userService.createUserActivity(creatorId, 'PREDICTION_CREATED', {
      predictionId: pred.id,
      title: pred.title,
    });

    res.status(201).json(pred);
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
