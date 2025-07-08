// apps/server/src/controllers/leaderboard.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import type { PublicLeaderboardEntry } from '@ems/types';

/**
 * GET /api/leaderboard/all-time
 * Query params:
 *   - limit? number of entries to return (default: 25)
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
 * GET /api/leaderboard/daily
 * Query params:
 *   - limit? number of entries to return (default: 25)
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

// Future endpoints for weekly/monthly leaderboards could be added similarly:
// export const getTopWeekly = async ( ... ) => { ... };
// export const getTopMonthly = async ( ... ) => { ... };
