import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { PongStatsService } from '../services/pongStats.service';
import { PongEloService } from '../services/pongElo.service';
import { PongRepository } from '../repositories/PongRepository';
import { PongSocketEmitter } from '../handlers/pongSocketHandlers';
import { serializeBigInt } from '../utils/bigintSerializer';

const pongRepository = new PongRepository();

/**
 * POST /api/pong/record-match
 * Record match result and process payouts with Elo calculations
 * Follows proper repository->service->response pattern
 */
export const recordMatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { matchId, winnerId, loserId, wagerAmount, payoutAmount, duration, isAI } = req.body;

    // Use service layer for all business logic (including socket emissions)
    const result = await PongStatsService.processMatchRecording(
      matchId,
      winnerId,
      loserId,
      wagerAmount,
      payoutAmount,
      duration,
      isAI,
      pongRepository,
      PongSocketEmitter, // Pass socket emitter to service layer
    );

    // Get final balances for response using repository
    let finalBalances: { [key: number]: number } = {};

    if (result.isLossOnly) {
      // Handle loss-only case
      if (result.loserId) {
        const loser = await pongRepository.findUserBalance(result.loserId);
        if (loser) {
          finalBalances[result.loserId] = Number(loser.muskBucks);
        }
      }
    } else {
      // Handle normal case with winner
      if (result.winnerId) {
        const winner = await pongRepository.findUserBalance(result.winnerId);
        if (winner) {
          finalBalances[result.winnerId] = Number(winner.muskBucks);
        }
      }

      if (result.loserId) {
        const loser = await pongRepository.findUserBalance(result.loserId);
        if (loser) {
          finalBalances[result.loserId] = Number(loser.muskBucks);
        }
      }
    }

    res.json({
      success: true,
      finalBalances,
    });
  } catch (error) {
    console.error('Pong record match error:', error);
    next(error);
  }
};

/**
 * GET /api/leaderboard/pong/elo - Get Elo leaderboard
 */
export const getEloLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const stats = await pongRepository.getEloLeaderboard(limit, offset);
    const leaderboard = PongStatsService.calculateLeaderboardMetrics(
      stats.map((s) => (s.user ? { ...s, user: s.user } : s)),
      offset,
    );

    res.json(serializeBigInt(leaderboard));
  } catch (error) {
    console.error('Get Elo leaderboard error:', error);
    next(error);
  }
};

/**
 * GET /api/leaderboard/pong/:metric - Get leaderboard by metric
 */
export const getLeaderboardByMetric = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const metric = req.params.metric;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let stats;
    switch (metric) {
      case 'wins':
        stats = await pongRepository.getWinsLeaderboard(limit, offset);
        break;
      case 'winStreak':
        stats = await pongRepository.getWinStreakLeaderboard(limit, offset);
        break;
      case 'totalWon':
        stats = await pongRepository.getTotalWonLeaderboard(limit, offset);
        break;
      case 'totalWagered':
        stats = await pongRepository.getWagerLeaderboard(limit, offset);
        break;
      case 'perfectGames':
        stats = await pongRepository.getPerfectGamesLeaderboard(limit, offset);
        break;
      default:
        res.status(400).json({ error: 'Invalid metric' });
        return;
    }

    const leaderboard = PongStatsService.calculateLeaderboardMetrics(stats, offset);
    res.json(serializeBigInt(leaderboard));
  } catch (error) {
    console.error('Get leaderboard by metric error:', error);
    next(error);
  }
};

/**
 * GET /api/users/:userId/pong-stats or /api/users/me/pong-stats - Get detailed user Pong statistics
 */
export const getUserPongStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let userId: number;
    if (req.params.userId === 'me' || !req.params.userId) {
      // For /me route or when no userId param (empty params), get user ID from auth middleware
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      userId = req.user.id;
    } else {
      userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }
    }

    // Use service to get stats with defaults (follows proper pattern)
    const enrichedStats = await PongStatsService.getUserStatsWithDefaults(userId, pongRepository);
    res.json(serializeBigInt(enrichedStats));
  } catch (error) {
    console.error('Get user Pong stats error:', error);
    next(error);
  }
};

/**
 * GET /api/pong/elo-distribution - Get global tier distribution
 */
export const getEloDistribution = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const distribution = await pongRepository.getTierDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Get Elo distribution error:', error);
    next(error);
  }
};

/**
 * GET /api/pong/elo-history/:userId - Get player's Elo progression
 */
export const getPlayerEloHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const stats = await pongRepository.findStatsByUserId(userId);
    const history = stats?.eloHistory || [];
    res.json(history);
  } catch (error) {
    console.error('Get Elo history error:', error);
    next(error);
  }
};

/**
 * GET /api/pong/predict-elo - Predict Elo change for potential wager
 */
export const predictEloChange = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { playerElo, opponentElo, wagerAmount } = req.query;

    const playerEloNum = parseInt(playerElo as string);
    const opponentEloNum = parseInt(opponentElo as string);
    const wagerAmountNum = parseInt(wagerAmount as string);

    if (isNaN(playerEloNum) || isNaN(opponentEloNum) || isNaN(wagerAmountNum)) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    // Use service (pure business logic) to predict Elo change
    const prediction = PongEloService.predictEloChange(
      playerEloNum,
      opponentEloNum,
      BigInt(wagerAmountNum),
    );

    res.json(prediction);
  } catch (error) {
    console.error('Predict Elo error:', error);
    next(error);
  }
};

/**
 * GET /api/users/:userId/pong-history - Get player's match history
 */
export const getUserPongHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const matches = await pongRepository.getPlayerMatchHistory(userId, limit);
    const enrichedHistory = PongStatsService.calculateMatchHistoryMetrics(matches, userId);
    res.json(serializeBigInt(enrichedHistory));
  } catch (error) {
    console.error('Get user Pong history error:', error);
    next(error);
  }
};
