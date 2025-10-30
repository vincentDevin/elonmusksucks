import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { PongStatsService } from '../services/pongStats.service';
import { PongEloService } from '../services/pongElo.service';
import { PongRepository } from '../repositories/PongRepository';
import { PongSocketEmitter } from '../handlers/pongSocketHandlers';
import { eventBus } from '../lib/EventBus';
import { UserService } from '../services/user.service';
import {
  toUserPongStatsView,
  toPongMatchHistoryView,
  toPongLeaderboardView,
  toPongTierDistributionView,
} from '../view/pong.view';
import type {
  UserPongStatsView,
  PongMatchHistoryView,
  PongLeaderboardView,
  PongTierDistributionView,
} from '@ems/types';

const pongRepository = new PongRepository();
const pongStatsService = new PongStatsService(pongRepository);
const userService = new UserService();

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
    const {
      matchId,
      winnerId,
      winnerName,
      winnerScore,
      loserId,
      loserName,
      loserScore,
      wagerAmount,
      payoutAmount,
      duration,
      isAI,
    } = req.body;

    // Debug logging to see what we're receiving
    console.log(`[DEBUG] Record match request:`, {
      matchId,
      winnerId,
      winnerName,
      winnerScore,
      loserId,
      loserName,
      loserScore,
      wagerAmount,
      payoutAmount,
      duration,
      isAI,
    });

    // Validation
    if (typeof matchId !== 'string') {
      res.status(400).json({ error: 'matchId must be a string' });
      return;
    }
    if (winnerId !== null && typeof winnerId !== 'number') {
      res.status(400).json({ error: 'winnerId must be a number or null' });
      return;
    }
    if (typeof winnerName !== 'string') {
      res.status(400).json({ error: 'winnerName must be a string' });
      return;
    }
    if (typeof winnerScore !== 'number') {
      res.status(400).json({ error: 'winnerScore must be a number' });
      return;
    }
    if (loserId !== null && typeof loserId !== 'number') {
      res.status(400).json({ error: 'loserId must be a number or null' });
      return;
    }
    if (loserName !== null && typeof loserName !== 'string') {
      res.status(400).json({ error: 'loserName must be a string or null' });
      return;
    }
    if (typeof loserScore !== 'number') {
      res.status(400).json({ error: 'loserScore must be a number' });
      return;
    }
    if (typeof wagerAmount !== 'number' || wagerAmount < 0) {
      res.status(400).json({ error: 'wagerAmount must be a non-negative number' });
      return;
    }
    if (typeof payoutAmount !== 'number' || payoutAmount < 0) {
      res.status(400).json({ error: 'payoutAmount must be a non-negative number' });
      return;
    }
    if (typeof duration !== 'number') {
      res.status(400).json({ error: 'duration must be a number' });
      return;
    }
    if (typeof isAI !== 'boolean') {
      res.status(400).json({ error: 'isAI must be a boolean' });
      return;
    }

    // Create service with injected socket emitter
    const socketEmitter = new PongSocketEmitter(eventBus);

    const result = await PongStatsService.processMatchRecording(
      matchId,
      winnerId,
      loserId,
      wagerAmount,
      payoutAmount,
      duration,
      winnerName,
      loserName,
      pongRepository,
      socketEmitter,
      isAI,
      winnerScore,
      loserScore,
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

    // Batch enrich user avatars with signed URLs before calculating metrics
    const users = stats.filter((stat) => stat.user).map((stat) => stat.user);
    const enrichedUsers = await userService.enrichUsersWithAvatars(users);
    const userMap = new Map(enrichedUsers.map((user) => [user.id, user]));

    const enrichedStats = stats.map((stat) => {
      if (stat.user) {
        return {
          ...stat,
          user: userMap.get(stat.user.id) || stat.user,
        };
      }
      return stat;
    });

    const leaderboard = PongStatsService.calculateLeaderboardMetrics(enrichedStats, offset);

    // Add user data back to leaderboard entries
    const enrichedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      user: enrichedStats[index]?.user,
    }));

    const payload = enrichedLeaderboard.map((entry, index) =>
      toPongLeaderboardView(entry, offset + index + 1),
    ) satisfies PongLeaderboardView[];
    res.json(payload);
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

    // Batch enrich user avatars with signed URLs before calculating metrics
    const users = stats.filter((stat) => stat.user).map((stat) => stat.user);
    const enrichedUsers = await userService.enrichUsersWithAvatars(users);
    const userMap = new Map(enrichedUsers.map((user) => [user.id, user]));

    const enrichedStats = stats.map((stat) => {
      if (stat.user) {
        return {
          ...stat,
          user: userMap.get(stat.user.id) || stat.user,
        };
      }
      return stat;
    });

    const leaderboard = PongStatsService.calculateLeaderboardMetrics(enrichedStats, offset);

    // Add user data back to leaderboard entries
    const enrichedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      user: enrichedStats[index]?.user,
    }));

    const payload = enrichedLeaderboard.map((entry, index) =>
      toPongLeaderboardView(entry, offset + index + 1),
    ) satisfies PongLeaderboardView[];
    res.json(payload);
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
    const payload = toUserPongStatsView(enrichedStats) satisfies UserPongStatsView;
    res.json(payload);
  } catch (error) {
    console.error('Get user Pong stats error:', error);
    next(error);
  }
};

export const getUserElo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const elo = await pongRepository.findEloByUserId(req.user.id);

    // Return defaults if no stats exist yet
    res.json({
      eloRating: elo?.eloRating || 1200,
      tier: elo?.tier || 'SILVER',
    });
  } catch (error) {
    console.error('Get user Elo error:', error);
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
    const payload = toPongTierDistributionView(distribution) satisfies PongTierDistributionView;
    res.json(payload);
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
    const payload = enrichedHistory.map(toPongMatchHistoryView) satisfies PongMatchHistoryView[];
    res.json(payload);
  } catch (error) {
    console.error('Get user Pong history error:', error);
    next(error);
  }
};

export const processWager = async (req: Request, res: Response) => {
  try {
    const { playerOneId, playerTwoId, wagerAmount, isAI } = req.body;

    // Validation
    if (typeof playerOneId !== 'number') {
      res.status(400).json({ error: 'playerOneId must be a number' });
      return;
    }
    if (playerTwoId !== null && typeof playerTwoId !== 'number') {
      res.status(400).json({ error: 'playerTwoId must be a number or null' });
      return;
    }
    if (typeof wagerAmount !== 'number' || wagerAmount < 0) {
      res.status(400).json({ error: 'wagerAmount must be a non-negative number' });
      return;
    }
    if (typeof isAI !== 'boolean') {
      res.status(400).json({ error: 'isAI must be a boolean' });
      return;
    }

    if (wagerAmount === 0) {
      res.json({ success: true, transactionId: 'free-play' });
      return;
    }

    const result = await pongStatsService.processWagerTransaction(
      playerOneId,
      playerTwoId,
      wagerAmount,
      isAI,
    );
    res.json({ success: true, transactionId: result.transactionId });
  } catch (error: any) {
    console.error('Pong process wager error:', error);

    if (error.message?.includes('Insufficient funds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to process wager' });
  }
};

export const validateWager = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;

    // Validation
    if (typeof userId !== 'number') {
      res.status(400).json({ error: 'userId must be a number' });
      return;
    }
    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ error: 'amount must be a non-negative number' });
      return;
    }

    const user = await pongStatsService.validateWager(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentBalance = Number(user.muskBucks);
    const valid = currentBalance >= amount;

    res.json({
      valid,
      currentBalance,
    });
  } catch (error) {
    console.error('Pong validate wager error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    await pongStatsService.healthCheck();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
};

export const authenticateUser = async (req: AuthRequest, res: Response) => {
  try {
    // User is already authenticated by requireAuth middleware
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await pongRepository.findUserForAuth(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      muskBucks: Number(user.muskBucks),
      pongElo: user.pongStats?.eloRating || 1200, // Default to 1200 if no stats yet
    });
  } catch (error) {
    console.error('Pong auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// AI Player cache - refresh every 5 minutes
const AI_PLAYER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let aiPlayerCache: {
  data: Array<{ id: number; name: string; avatarUrl: string | null }> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

/**
 * GET /api/pong/ai-players
 * Fetch all AI players (cached, public endpoint)
 */
export const getAllAIPlayers = async (_req: Request, res: Response) => {
  try {
    // Check cache
    const now = Date.now();
    if (aiPlayerCache.data && now - aiPlayerCache.timestamp < AI_PLAYER_CACHE_TTL) {
      res.json(aiPlayerCache.data);
      return;
    }

    // Fetch all AI players (ids -1 to -4)
    const aiPlayerIds = [-1, -2, -3, -4];
    const playerPromises = aiPlayerIds.map((id) => pongRepository.getAIPlayerById(id));
    const players = await Promise.all(playerPromises);

    const validPlayers = players.filter((p) => p !== null) as Array<{
      id: number;
      name: string;
      avatarUrl: string | null;
    }>;

    // Update cache
    aiPlayerCache = {
      data: validPlayers,
      timestamp: now,
    };

    res.json(validPlayers);
  } catch (error) {
    console.error('Error fetching AI players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/pong/ai-players/:id
 * Fetch AI player basic info (id, name, avatarUrl)
 * Used by pong-server to get AI player data from database
 */
export const getAIPlayerById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const aiPlayer = await pongRepository.getAIPlayerById(userId);

    if (!aiPlayer) {
      res.status(404).json({ error: 'AI player not found' });
      return;
    }

    res.json({
      id: aiPlayer.id,
      name: aiPlayer.name,
      avatarUrl: aiPlayer.avatarUrl,
    });
  } catch (error) {
    console.error('Error fetching AI player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
