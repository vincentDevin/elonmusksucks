// apps/server/src/controllers/betting.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { bettingService } from '../services/betting.service';

type ReqWithUser = Request & { user?: { id: number } };

/**
 * POST /api/bet
 * Place a single bet for the authenticated user
 */
export const placeBetHandler = async (
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { optionId, amount } = req.body as { optionId: number; amount: number };
    const bet = await bettingService.placeBet(userId, optionId, amount);
    res.status(201).json(bet);
  } catch (err: any) {
    next(err);
  }
};

/**
 * POST /api/parlay
 * Place a parlay (multi-leg bet) for the authenticated user
 */
export const placeParlayHandler = async (
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { legs, amount } = req.body as { legs: Array<{ optionId: number }>; amount: number };
    const parlay = await bettingService.placeParlay(userId, legs, amount);
    res.status(201).json(parlay);
  } catch (err: any) {
    next(err);
  }
};
