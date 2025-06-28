// apps/server/src/controllers/predictions.controller.ts
import type { Request, Response, NextFunction } from 'express';

type ReqWithUser = Request & { user?: { id: number } };

import { predictionService } from '../services/predictions.service';

/**
 * GET /api/predictions
 * List all predictions
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
 * Get a single prediction by ID
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
 * Create a new prediction
 */
export const createPrediction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, category, expiresAt } = req.body;
    const prediction = await predictionService.createPrediction({
      title,
      description,
      category,
      expiresAt: new Date(expiresAt),
    });
    res.status(201).json(prediction);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/:id/bets
 * Place a bet on a prediction
 */
export const placeBetHandler = async (
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const predictionId = Number(req.params.id);
    const { amount, optionId } = req.body as { amount: number; optionId: number };
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const bet = await predictionService.placeBet(userId, predictionId, amount, optionId);
    res.status(201).json(bet);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/predictions/:id/resolve
 * Resolve a prediction and settle bets
 */
export const resolvePredictionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    const updated = await predictionService.resolvePrediction(predictionId, winningOptionId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions/leaderboard
 * Get the leaderboard of top users
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
