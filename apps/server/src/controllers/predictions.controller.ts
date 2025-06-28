// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/predictions.service';
import { payoutService } from '../services/payout.service';

/**
 * GET /api/predictions
 */
export const getAllPredictions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictions = await predictionService.listAllPredictions();
    res.json(predictions);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/:id
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
 */
export const createPrediction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, category, expiresAt, options } = req.body as {
      title: string;
      description: string;
      category: string;
      expiresAt: string;
      options: Array<{ label: string }>;
    };

    const prediction = await predictionService.createPrediction({
      title,
      description,
      category,
      expiresAt: new Date(expiresAt),
      options,
    });

    res.status(201).json(prediction);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/:id/resolve
 */
export const resolvePredictionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    // Delegate to PayoutService
    await payoutService.resolvePrediction(predictionId, winningOptionId);
    // refetch the now-resolved prediction for the client
    const updated = await predictionService.getPrediction(predictionId);
    if (!updated) {
      res.status(404).json({ error: 'Prediction not found after resolve' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/leaderboard
 */
export const getLeaderboard = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const leaderboard = await predictionService.getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
};
