// apps/server/src/controllers/leaderboard.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import type { PublicLeaderboardEntry } from '@ems/types';

/**
 * GET /api/leaderboard/all-time?limit=N
 */
export const getTopAllTime = async (
  req: Request,
  res: Response<PublicLeaderboardEntry[]>,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const entries = await leaderboardService.getTopAllTime(limit);
    res.json(entries);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/daily?limit=N
 */
export const getTopDaily = async (
  req: Request,
  res: Response<PublicLeaderboardEntry[]>,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const entries = await leaderboardService.getTopDaily(limit);
    res.json(entries);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/leaderboard/refresh
 * Enqueues a background job to refresh the materialized view and emit updates
 */
export const refreshLeaderboard = async (
  _req: Request,
  res: Response<{ message: string }>,
  next: NextFunction,
): Promise<void> => {
  try {
    await leaderboardService.enqueueRefresh();
    res.status(202).json({ message: 'Leaderboard refresh enqueued' });
  } catch (err) {
    next(err);
  }
};
