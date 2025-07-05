// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/predictions.service';
import { payoutService } from '../services/payout.service';
import { UserService } from '../services/user.service';
import { PredictionType } from '@ems/types';

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
    res.json(all);
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
    res.json(prediction);
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
    const { title, description, category, expiresAt, options, type, threshold } = req.body as {
      title: string;
      description: string;
      category: string;
      expiresAt: string;
      options?: Array<{ label: string }>;
      type: PredictionType;
      threshold?: number;
    };

    const creatorId = (req as any).user?.id;
    if (!creatorId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
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
 * POST /api/predictions/:id/resolve
 * Resolve a prediction, payout all bets & parlays, then return the updated record.
 */
export const resolvePredictionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    const userId = (req as any).user?.id;

    await payoutService.resolvePrediction(predictionId, winningOptionId);

    const updated = await predictionService.getPrediction(predictionId);
    if (!updated) {
      res.status(404).json({ error: 'Prediction not found after resolve' });
      return;
    }

    if (userId) {
      await userService.createUserActivity(userId, 'PREDICTION_RESOLVED', {
        predictionId,
        winningOptionId,
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/leaderboard
 * Return the top users by MuskBucks balance.
 */
export const getLeaderboard = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const board = await predictionService.getLeaderboard();
    res.json(board);
  } catch (err) {
    next(err);
  }
};
