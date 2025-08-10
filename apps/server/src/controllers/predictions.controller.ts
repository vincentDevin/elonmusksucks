// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/predictions.service';
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
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedPredictions = all.map(prediction => ({
      ...prediction,
      bets: prediction.bets.map(bet => ({
        ...bet,
        amount: bet.amount.toString(),
        potentialPayout: bet.potentialPayout?.toString() || null,
        payout: bet.payout?.toString() || null,
      })),
    }));
    
    res.json(serializedPredictions);
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
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedPrediction = {
      ...prediction,
      bets: prediction.bets.map(bet => ({
        ...bet,
        amount: bet.amount.toString(),
        potentialPayout: bet.potentialPayout?.toString() || null,
        payout: bet.payout?.toString() || null,
      })),
    };
    
    res.json(serializedPrediction);
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
