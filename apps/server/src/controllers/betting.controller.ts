// apps/server/src/controllers/betting.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { bettingService } from '../services/betting.service';
import { UserService } from '../services/user.service';
const userService = new UserService();

type ReqWithUser = Request & { user?: { id: number } };

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

    // Log activity
    await userService.createUserActivity(userId, 'BET_PLACED', {
      betId: bet.id,
      optionId: bet.optionId,
      amount: bet.amount,
      predictionId: bet.predictionId,
    });

    res.status(201).json(bet);
  } catch (err) {
    next(err);
  }
};

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

    // Log activity
    await userService.createUserActivity(userId, 'PARLAY_PLACED', {
      parlayId: parlay.id,
      amount: parlay.amount,
      legs: legs.map((leg) => leg.optionId),
    });

    res.status(201).json(parlay);
  } catch (err) {
    next(err);
  }
};
