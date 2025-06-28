// apps/server/src/controllers/payout.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { payoutService } from '../services/payout.service';

export const resolvePredictionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const predictionId = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    await payoutService.resolvePrediction(predictionId, winningOptionId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};
