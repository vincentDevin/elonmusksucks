// apps/server/src/controllers/leaderboard.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import type { LeaderboardEntryView } from '@ems/types';
import type {
  PaginatedLeaderboard,
  UserRank,
  LeaderboardStats,
  LeaderboardQuery,
} from '../repositories/ILeaderboardRepository';
import { toLeaderboardEntryView } from '../view/leaderboard.view';

/**
 * GET /api/leaderboard/all-time?limit=N
 */
export const getTopAllTime = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const entries = await leaderboardService.getTopAllTime(limit);

    const payload = entries.map((entry, index) =>
      toLeaderboardEntryView(entry, index + 1),
    ) satisfies LeaderboardEntryView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/daily?limit=N
 */
export const getTopDaily = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const entries = await leaderboardService.getTopDaily(limit);

    const payload = entries.map((entry, index) =>
      toLeaderboardEntryView(entry, index + 1),
    ) satisfies LeaderboardEntryView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/all-time/paginated?limit=N&offset=N&metric=profit
 */
export const getTopAllTimePaginated = async (
  req: Request,
  res: Response<PaginatedLeaderboard>,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 25;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const metric =
      (req.query.metric as string) === 'winRate'
        ? 'winRate'
        : (req.query.metric as string) === 'volume'
          ? 'volume'
          : (req.query.metric as string) === 'roi'
            ? 'roi'
            : 'profit';

    const params: LeaderboardQuery = { limit, offset, metric };
    const result = await leaderboardService.getTopAllTimePaginated(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/daily/paginated?limit=N&offset=N&metric=profit
 */
export const getTopDailyPaginated = async (
  req: Request,
  res: Response<PaginatedLeaderboard>,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 25;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const metric =
      (req.query.metric as string) === 'winRate'
        ? 'winRate'
        : (req.query.metric as string) === 'volume'
          ? 'volume'
          : (req.query.metric as string) === 'roi'
            ? 'roi'
            : 'profit';

    const params: LeaderboardQuery = { limit, offset, metric };
    const result = await leaderboardService.getTopDailyPaginated(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/user/:userId/rank?period=allTime|daily
 */
export const getUserRank = async (
  req: Request<{ userId: string }>,
  res: Response<UserRank>,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const period = (req.query.period as string) === 'daily' ? 'daily' : 'allTime';

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' } as any);
      return;
    }

    const rank = await leaderboardService.getUserRank(userId, period);
    res.json(rank);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/leaderboard/stats
 */
export const getLeaderboardStats = async (
  _req: Request,
  res: Response<LeaderboardStats>,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await leaderboardService.getLeaderboardStats();
    res.json(stats);
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
